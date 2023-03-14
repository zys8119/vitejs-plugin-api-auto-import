# vitejs-plugin-api-auto-import

vite 自动api导入

## 安装

`
npm i vitejs-plugin-api-auto-import
`
## 使用方法

1. vite.config.ts

```typescript
import {defineConfig} from "vite"
import AutoRoute from 'vitejs-plugin-vue-route-auto-import'
export default defineConfig({
    plugins:[
        // AutoRoute({
        //     // 全局的模块名称
        //     name:string
        //     // 编译输出的目录
        //     dir:string
        //     // 导出的变量名称
        //     constApiData:string
        //     // 输出的文件名称
        //     outFile:string
        //     // 全局注入的文件校验规则
        //     include:RegExp[]
        //     // 其他模块按需的导入
        //     resolvers?:Resolver[]
        //     导入别名
        //     resolveAliasName?:string
        //     是否动态导入别名
        //     autoResolveAliasName?:string
        // })
        AutoApi({
            name:'$apis',
            dir:'api',
            constApiData:'$apiData',
            outFile:'index.ts',
            include:[
                /\.[tj]sx?$/, // .ts, .tsx, .js, .jsx
                /\.vue$/, /\.vue\?vue/, // .vue
                /\.md$/, // .md
            ],
            resolvers:[
                {
                    from:'../data',
                    resolve(ccc){
                        return {
                            ccc,
                        }
                    }
                },
                {
                    from:'../data/index',
                    resolve({a_b_aa, asdas}){
                        return {
                            a_b_aa,
                            b:2,
                            v:{
                                asda:{
                                    as:4554,
                                    asd:['asda'],
                                    asdasdas:asdas
                                }
                            }
                        }
                    }
                }
            ],
        })
    ]
})
```

2. main.ts

```typescript
import App from "./App.vue"
import route from "./route"
const app = createApp(App)
.use(route)
app.mount('#app')
```
