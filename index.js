/*
 * Primary file for the API
 *
 */

// Dependencies
import http from "http";
import https from "https";
import url from "url";
import { StringDecoder } from "string_decoder";
import fs from "fs";

import { router, handlers } from "./handlers.js";
import config from "./config.js";
import helpers from "./lib/helpers.js";

const httpServer = http.createServer(function (req, res) {
  unifiedServer(req, res);
});

httpServer.listen(config.httpPort, function () {
  console.log(`Listen on port ${config.httpPort} in ${config.envName} mode`);
});

const httpsServerOptions = {
  key: fs.readFileSync("./https/key.pem"),
  cert: fs.readFileSync("./https/cert.pem"),
};

const httpsServer = https.createServer(httpsServerOptions, function (req, res) {
  unifiedServer(req, res);
});

httpsServer.listen(config.httpsPort, function () {
  console.log(`Listen on port ${config.httpsPort} in ${config.envName} mode`);
});

const unifiedServer = function (req, res) {
  const baseURL = "http://" + req.headers.host + "/";
  const parsedUrl = new url.URL(req.url, baseURL);
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, "");

  const queryStringObject = parsedUrl.searchParams;
  const method = req.method.toLowerCase();
  const headers = req.headers;
  const decoder = new StringDecoder("utf-8");
  let buffer = "";
  req.on("data", function (data) {
    buffer += decoder.write(data);
  });

  req.on("end", function () {
    buffer += decoder.end();

    const chosenHandler =
      typeof router[trimmedPath] !== "undefined"
        ? router[trimmedPath]
        : handlers.notFound;

    const data = {
      trimmedPath,
      queryStringObject: helpers.urlSearchParamsToObject(queryStringObject),
      method,
      headers,
      payload: helpers.parseJsonToObject(buffer),
    };

    chosenHandler(data, function (statusCode, payload) {
      statusCode = typeof statusCode === "number" ? statusCode : 200;
      payload = typeof payload === "object" ? payload : {};
      const payloadString = JSON.stringify(payload);
      res.setHeader("Content-Type", "application/json");
      res.writeHead(statusCode);
      res.end(payloadString);
      console.log(`Returning this response: ${statusCode} ${payloadString}`);
    });
  });
};
