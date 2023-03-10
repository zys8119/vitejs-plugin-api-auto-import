<%= importData %>
export const <%= constApiData %> = <%= data %>
export {
    <%= exportData %>
}
export default <%= apis %>

declare global {
    const <%= apis %>:typeof <%= constApiData %>
}
