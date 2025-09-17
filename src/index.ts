import app from "./app";

const PORT = 8989;

function main() {
  console.log("Listening on port", PORT);
  app.listen(PORT);
}

main();
