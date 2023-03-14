/*eslint-disable*/
<%= importData %>

function getApi<T extends {default:any} | Record<any, any>, V = T extends { default:any } ? T['default'] : T>(data:T): V{
    if (Object.keys(data).includes('default')) {
        return data.default
    }else {
        return data as V
    }
}

export const <%= constApiData %> = <%= data %>

<%= exportData %>

export default <%= constApiData %>

declare global {
    const <%= apis %>:typeof <%= constApiData %>
}
