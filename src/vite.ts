import {Plugin} from "vite"
import {merge, template} from "lodash"
import {sync} from "fast-glob"
import {mkdirSync, writeFileSync, readFileSync, existsSync} from "fs-extra"
import {resolve} from "path"
import {js_beautify} from "js-beautify"
export interface AutoApi {
    [key:string]:any
    // 全局的模块名称
    name:string
    // 编译输出的目录
    dir:string
    // 导出的变量名称
    constApiData:string
    // 输出的文件名称
    outFile:string
    // 全局注入的文件校验规则
    include:RegExp[]
    // 其他模块按需的导入
    resolvers?:Resolver[]
    // 导入别名
    resolveAliasName?:string
    // 是否动态导入别名
    autoResolveAliasName?:boolean
    // 排除文件
    exclude?:RegExp
    // 是否开启全部导出
    allExport?:boolean
    // 需要导出的字段，优先级最高
    import?:string | boolean
}

export interface Resolver {
    // 导入的模块名称
    from:string,
    // 按需导入函数
    resolve(importData:any):Record<any, any>
}
function toCamelCase(str) {
    return str.replace(/-([a-z])/g, function(match, letter) {
        return letter.toUpperCase();
    });
}

function pathToTree(paths:string[], allExport:boolean) {
    const tree = {};
    paths.forEach(path => {
        const parts = path.split('/').map(e=>toCamelCase(e));
        let node = tree;
        parts.forEach((part,key) => {
            if (!node[part]) {
                const isFile = (key+1) === parts.length
                const fileName = isFile ? part.replace(/\..*/,'') : part
                const nameOrigin = toCamelCase(path.replace(/\..*/, "").split("/").join("_"))
                const name = `${nameOrigin}_import`
                node[toCamelCase(fileName)] = isFile ? (allExport ? `getApi(${name})` : name) : {};
            }
            node = node[part];
        });
    });
    return tree;
}
function transformFile(config:AutoApi, apiDirPath:string, mainFilePath:string, resolveAliasName:string){
    if(!existsSync(apiDirPath)) mkdirSync(apiDirPath)
    const resolvers = config.resolvers
    const files:string[] = sync(`${resolve(apiDirPath, '**/*.ts')}`,{
        absolute:false
    })
        .filter(e=>!e.includes(mainFilePath) && (Object.prototype.toString.call(config.exclude) === '[object RegExp]' ? !config.exclude.test(e) : true))
    const treeData = pathToTree(files.map(e=>e.replace(new RegExp(apiDirPath+'\/*'),'')), config.allExport)
    const importData = files.map(e=>{
        const path = e.replace(new RegExp(`${apiDirPath}\/*|\\.\\w+$`,'img'), '')
        const nameOrigin = toCamelCase(path.split("/").join("_"))
        const name = `${nameOrigin}_import`
        const getApiName = `export const ${nameOrigin} = ${config.allExport ? `getApi(${name})` : name}`
        return {
            name,
            getApiName,
            path
        };
    })

    const resolversMap = resolvers.map((e, k) => {
        const resolveStr = e.resolve.toString()
        const name:any = resolveStr.match(/resolve\s*\((.*)\)/im)[1]
        const nameHash = `NAMEHASH_${[...name].map(e=>e.charCodeAt(0).toString(16)).join('')}_${(Date.now()+k).toString(16)}`
        try {
            return {
                import:`\nimport * as ${nameHash} from "${e.from}"`,
                const:`\nconst ${name} = ${nameHash}`,
                data:resolveStr
                    .replace(/resolve\s*\(.*?\)\s*\{\s*\n|\s*\}$/g,'')
                    .replace(/return\s*\{|};$/g,'')
                    .trim()
            }
        }catch (e) {
            return {
                import:'',
                data:''
            }
        }
    }).filter(e=>e.import && e.data)
    const importField = (name:string)=> {
        if(config.import === true){
            return name
        }else if(config.import === false){
            return config.allExport ? `* as ${name}` : name
        }else if(typeof config.import === 'string'){
            return `{ ${config.import} as ${name}}`
        }
        return name
    }
    const templateData = {
        importData:importData.map(({name, path})=>`// @ts-ignore\nimport ${importField(name)} from "${resolveAliasName}/${path}"`).join("\n"),
        data:JSON.stringify(treeData, null, 4).replace(/"|'/img,''),
        exportData:importData.map(({getApiName})=>getApiName).join("\n"),
        constApiData:config.constApiData,
        apis:config.name,
    }
    if(resolversMap.length > 0){
        templateData.importData += `${resolversMap.map(e=>e.import).join("")}${resolversMap.map(e=>e.const).join("")}`
        templateData.data = templateData.data.replace(/(^\{\n)/,`$1\n${resolversMap.map(e=>e.data).join(',')},`)
    }

    const templateStr = template(readFileSync(resolve(__dirname, "../src/template.ts"), 'utf-8'))(templateData)
    writeFileSync(resolve(apiDirPath, config.outFile), js_beautify(templateStr))
}

export function autoApi (options?:Partial<AutoApi>):Plugin{
    const config:AutoApi = merge({
        name:'$apis',
        dir:'api',
        constApiData:'$apiData',
        outFile:'index.ts',
        include:[
            /\.[tj]sx?$/, // .ts, .tsx, .js, .jsx
            /\.vue$/, /\.vue\?vue/, // .vue
            /\.md$/, // .md
        ],
        resolvers:[],
        autoResolveAliasName:false,
        allExport:false,
        import:true,
    } as AutoApi, options)
    const outFileName = config.outFile.replace(/\.ts$/,'')
    const reg = new RegExp(config.name.replace(/(\$)/g,'\\$1'))
    const resolveAliasName = config.resolveAliasName || (config.autoResolveAliasName ? `@viteApiAutoRoot_${Date.now()+Math.round(Math.random()*10000000).toString(16)}` : '.')
    const apiDirPath = resolve(process.cwd(), config.dir)
    const mainFilePath = resolve(apiDirPath,'index.ts')
    transformFile(config, apiDirPath, mainFilePath, resolveAliasName)
    return {
        enforce:'post',
        name:'vitejs-plugin-api-auto-import',
        configureServer:{
            order:"pre",
            handler(serve){
                serve.watcher.on('all', (type, path)=>{
                    if(path !== mainFilePath && path.includes(apiDirPath)){
                        transformFile(config, apiDirPath, mainFilePath, resolveAliasName)
                    }
                })
                serve.watcher.add(apiDirPath)
            }
        },
        config(config){
            return /^@/.test(resolveAliasName) ? merge(config, {
                resolve:{
                    alias:{
                        [resolveAliasName]:apiDirPath
                    }
                }
            }) : config
        },
        transform(code,id){
            if(code.match(reg) && config.include.find(reg=>reg.test(id))){
                return `import ${config.name} from "${resolveAliasName}/${outFileName}"\n${code}`
            }
        }
    }
}

export default autoApi
