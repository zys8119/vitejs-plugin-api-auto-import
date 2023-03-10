import {Plugin} from "vite"
import {merge, template} from "lodash"
import {sync} from "fast-glob"
import {mkdirSync, writeFileSync, readFileSync, existsSync} from "fs-extra"
import {resolve} from "path"
export interface AutoApi {
    name:string
    dir:string
    constApiData:string
    outFile:string
    include:RegExp[]
}
function pathToTree(paths:string[]) {
    const tree = {};
    paths.forEach(path => {
        const parts = path.split('/');
        let node = tree;
        parts.forEach((part,key) => {
            if (!node[part]) {
                const isFile = (key+1) === parts.length
                const fileName = isFile ? part.replace(/\..*/,'') : part
                node[fileName] = isFile ? `${path.replace(/\..*/,'').split("/").join("_")}` : {};
            }
            node = node[part];
        });
    });
    return tree;
}
function transformFile(config:AutoApi, apiDirPath:string, mainFilePath:string){
    if(!existsSync(apiDirPath)) mkdirSync(apiDirPath)
    const files:string[] = sync(`${resolve(apiDirPath, '**/*.ts')}`)
        .filter(e=>!e.includes(mainFilePath))
    const treeData = pathToTree(files.map(e=>e.replace(new RegExp(apiDirPath+'\/*'),'')))
    const importData = files.map(e=>{
        const path = e.replace(new RegExp(`${apiDirPath}\/*|\\.\\w+$`,'img'), '')
        return {
            name:path.split("/").join("_"),
            path,
        }
    })
    const templateStr = template(readFileSync(resolve(__dirname, "../src/template.ts"), 'utf-8'))({
        importData:importData.map(({name, path})=>`import ${name} from "./${path}"`).join("\n"),
        data:JSON.stringify(treeData, null, 4).replace(/"|'/img,''),
        exportData:importData.map(({name})=>name).join(",\n\t"),
        constApiData:config.constApiData,
        apis:config.name,
    })
    writeFileSync(resolve(apiDirPath, config.outFile), templateStr)
}

export function autoApi (options:Partial<AutoApi>):Plugin{
    const config:AutoApi = merge({
        name:'$apis',
        dir:'api',
        constApiData:'$apiData',
        outFile:'index.ts',
        include:[
            /\.[tj]sx?$/, // .ts, .tsx, .js, .jsx
            /\.vue$/, /\.vue\?vue/, // .vue
            /\.md$/, // .md
        ]
    } as AutoApi, options)
    const apiDirPath = resolve(process.cwd(), config.dir)
    const mainFilePath = resolve(apiDirPath,'index.ts')
    transformFile(config, apiDirPath, mainFilePath)
    return {
        enforce:'pre',
        name:'vitejs-plugin-api-auto-import',
        configureServer:{
            order:"pre",
            handler(serve){
                serve.watcher.on('all', (type, path)=>{
                    if(path !== mainFilePath && path.includes(apiDirPath)){
                        transformFile(config, apiDirPath, mainFilePath)
                    }
                })
                serve.watcher.add(apiDirPath)
            }
        },
        config(config){
            return merge(config, {
                resolve:{
                    alias:{
                        '@viteApiAutoRoot':apiDirPath
                    }
                }
            })
        },
        transform(code,id){
            if(config.include.find(reg=>reg.test(id))){
                return `import ${config.name} from "@viteApiAutoRoot/index"\n${code}`
            }
        }
    }
}

export default autoApi
