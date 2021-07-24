import fs from "fs/promises";
import path from "path";

import { fileURLToPath } from "url";
import helpers from "./helpers.js";

// we need to change up how __dirname is used for ES6 purposes
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const lib = {};

lib.baseDir = path.join(__dirname, "/../.data/");

lib.create = function (dir, file, data) {
  let _fileDescriptor = null;
  return fs
    .open(lib.baseDir + dir + "/" + file + ".json", "wx")
    .then(
      (fileDescriptor) => {
        if (fileDescriptor) {
          const stringData = JSON.stringify(data);
          _fileDescriptor = fileDescriptor;
          return fs.writeFile(fileDescriptor, stringData);
        } else {
          throw new Error("Could not create new file, it may already exist");
        }
      },
      (err) => {
        throw new Error("Could not create new file, it may already exist");
      }
    )
    .then(
      () => {},
      (err) => {
        throw new Error("Error writing to new file");
      }
    )
    .finally(() => {
      return _fileDescriptor && _fileDescriptor.close();
    });
};

lib.read = function (dir, file) {
  return fs
    .readFile(lib.baseDir + dir + "/" + file + ".json", "utf8")
    .then(function (data) {
      if (data) {
        const parsedData = helpers.parseJsonToObject(data);
        return parsedData;
      }
    });
};

lib.update = function (dir, file, data) {
  let _fileDescriptor = null;
  return fs
    .open(lib.baseDir + dir + "/" + file + ".json", "r+")
    .then(
      (fileDescriptor) => {
        _fileDescriptor = fileDescriptor;
        return fileDescriptor.truncate();
      },
      function (err) {
        throw new Error(
          "Could not open the file for updating, it may not exist yet"
        );
      }
    )
    .then(
      () => {
        const stringData = JSON.stringify(data);
        return fs.writeFile(_fileDescriptor, stringData);
      },
      function (err) {
        console.log(err);
        throw new Error("Error truncating file");
      }
    )
    .then(
      () => {},
      function (err) {
        console.log(err);
        throw new Error("Error writing to existing file");
      }
    )
    .finally(() => {
      _fileDescriptor && _fileDescriptor.close();
    });
};

lib.delete = function (dir, file) {
  return fs.unlink(lib.baseDir + dir + "/" + file + ".json").catch((err) => {
    throw new Error("Error deleting file");
  });
};

export default lib;
