const { app } = require("electron");
const path = require("node:path");
const directory = process.env.PRODOPS_SECONDARY_DATA;
if (!directory || !path.isAbsolute(directory)) throw new Error("Secondary test needs isolated data");
app.setPath("userData", directory);
require("../dist/main/index.js");
