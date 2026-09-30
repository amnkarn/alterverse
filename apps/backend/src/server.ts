import app from "./app.js";

const PORT = process.env.PORT || 8000;

app.listen(PORT, () =>{
    console.log(`app is listning on port ${PORT}`);
})