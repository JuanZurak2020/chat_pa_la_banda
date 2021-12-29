const { MongoClient } = require("mongodb");
require('dotenv').config();

module.exports = async function checkPassword(username, password) {
    const user = process.env.USER_MONGO;
    const pass = process.env.PASS_MONGO;
    const uri =
        `mongodb+srv://${user}:${pass}@cluster0.kkkyi.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
    const client = new MongoClient(uri);
    await client.connect();
    const connect = client.db("chatcito");
    const collection = connect.collection("users");
    const users = await collection.findOne({"user": username, "pass": password});
    await client.close();
    return {
        response: users
    };
}
// checkPassword().then(r => {
//     if (r.response != null) {
//         return r.response.nickname
//     } else {
//         return false;
//     }
// }).catch(r => {
//     console.log(r);
// });
