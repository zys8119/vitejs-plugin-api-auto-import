<%= importData %>
export const <%= constApiData %> = <%= data %>
export {
    <%= exportData %>
}
export default <%= constApiData %>

declare global {
    const <%= apis %>:typeof <%= constApiData %>
}
