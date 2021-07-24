import _data from "./lib/data.js";
import helpers from "./lib/helpers.js";

export const handlers = {};

const EMAIL_REGEX = new RegExp(
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
);

handlers.users = function (data, callback) {
  const acceptableMethods = ["post", "get", "put", "delete"];

  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, callback);
  } else {
    callback(405);
  }
};

handlers._users = {};

handlers._users.post = function (data, callback) {
  const name =
    typeof data.payload.name === "string" && data.payload.name.trim().length > 0
      ? data.payload.name.trim()
      : false;
  const email =
    typeof data.payload.email === "string" &&
    data.payload.email.trim().length > 0 &&
    data.payload.email.match(EMAIL_REGEX) !== null
      ? data.payload.email.trim()
      : false;
  const streetAddress =
    typeof data.payload.streetAddress === "string" &&
    data.payload.streetAddress.trim().length > 0
      ? data.payload.streetAddress.trim()
      : false;
  const password =
    typeof data.payload.password === "string" &&
    data.payload.password.trim().length === 10
      ? data.payload.password.trim()
      : false;

  if (!(name && email && streetAddress)) {
    return callback(400, { Error: "Missing required fields" });
  }

  _data
    .read("users", email)
    .then(() => {
      const hashedPassword = helpers.hash(password);
      if (hashedPassword) {
        const userObject = {
          name,
          email,
          streetAddress,
          hashedPassword,
        };

        _data
          .create("users", email, userObject)
          .then(() => {
            callback(200);
          })
          .catch((err) => {
            console.log(err);
            callback(500, { Error: "Could not create the new user" });
          });
      } else {
        callback(500, { Error: "Could not hash the user's password" });
      }
    })
    .catch((err) => {
      callback(400, {
        Error: "A user with that email number already exists",
      });
    });
};

handlers._users.get = function (data, callback) {
  const email =
    typeof data.payload.email === "string" &&
    data.payload.email.trim().length > 0 &&
    data.payload.email.match(EMAIL_REGEX) !== null
      ? data.payload.email.trim()
      : false;

  if (email) {
    const token =
      typeof data.headers.token === "string" ? data.headers.token : false;
    handlers._tokens.verifyToken(token, email, function (tokenIsValid) {
      if (!tokenIsValid) {
        return callback(403, {
          Error: "Missing required token in header, or token is invalid",
        });
      }

      _data
        .read("users", email)
        .then((data) => {
          if (data) {
            delete data.hashedPassword;
            callback(200, data);
          } else {
            callback(404);
          }
        })
        .catch((err) => {
          callback(404);
        });
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

handlers._users.put = function (data, callback) {
  const name =
    typeof data.payload.name === "string" && data.payload.name.trim().length > 0
      ? data.payload.name.trim()
      : false;
  const email =
    typeof data.payload.email === "string" &&
    data.payload.email.trim().length > 0 &&
    data.payload.email.match(EMAIL_REGEX) !== null
      ? data.payload.email.trim()
      : false;
  const streetAddress =
    typeof data.payload.streetAddress === "string" &&
    data.payload.streetAddress.trim().length > 0
      ? data.payload.streetAddress.trim()
      : false;
  const password =
    typeof data.payload.password === "string" &&
    data.payload.password.trim().length === 10
      ? data.payload.password.trim()
      : false;

  if (!email) {
    return callback(400, { Error: "Missing required field" });
  }

  if (!(name || streetAddress || password)) {
    return callback(400, { Error: "Missing field to update" });
  }

  const token =
    typeof data.headers.token === "string" ? data.headers.token : false;

  handlers._tokens.verifyToken(token, email, function (tokenIsValid) {
    if (!tokenIsValid) {
      return callback(403, {
        Error: "Missing required token in header, or token is invalid",
      });
    }
    _data
      .read("users", email)
      .then(
        (userData) => {
          if (!userData) {
            return callback(400, {
              Error: "The specified user does not exist",
            });
          }

          if (name) {
            userData.name = name;
          }
          if (streetAddress) {
            userData.streetAddress = streetAddress;
          }
          if (password) {
            userData.hashedPassword = helpers.hash(password);
          }

          return _data.update("users", email, userData);
        },
        (err) => {
          return callback(400, { Error: "The specified user does not exist" });
        }
      )
      .then(
        () => {
          callback(200);
        },
        (err) => {
          console.log(err);
          callback(500, { Error: "Could not update the user" });
        }
      );
  });
};

handlers._users.delete = function (data, callback) {
  const email =
    typeof data.payload.email === "string" &&
    data.payload.email.trim().length > 0 &&
    data.payload.email.match(EMAIL_REGEX) !== null
      ? data.payload.email.trim()
      : false;

  if (!email) {
    return callback(400, { Error: "Missing required field" });
  }

  const token =
    typeof data.headers.token === "string" ? data.headers.token : false;

  handlers._tokens.verifyToken(token, email, function (tokenIsValid) {
    if (!tokenIsValid) {
      callback(403, {
        Error: "Missing required token in header, or token is invalid",
      });
    }

    _data
      .read("users", email)
      .then(
        (userData) => {
          if (!userData) {
            return callback(400, { Error: "Could not find specified user" });
          }
          return _data.delete("users", email);
        },
        (err) => {
          return callback(400, { Error: "Could not find specified user" });
        }
      )
      .then(
        () => {
          callback(200);
        },
        (err) => {
          return callback(500, {
            Error: "Could not delete the specified user",
          });
        }
      );
  });
};

handlers.tokens = function (data, callback) {
  const acceptableMethods = ["post", "get", "put", "delete"];

  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405);
  }
};

handlers._tokens = {};

handlers._tokens.post = function (data, callback) {
  const email =
    typeof data.payload.email === "string" &&
    data.payload.email.trim().length > 0 &&
    data.payload.email.match(EMAIL_REGEX) !== null
      ? data.payload.email.trim()
      : false;
  const password =
    typeof data.payload.password === "string" &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;

  if (!(email && password)) {
    return callback(400, { Error: "Missing required field(s)" });
  }

  let tokenObject = {};

  _data
    .read("users", email)
    .then(
      function (userData) {
        if (!userData) {
          return callback(400, { Error: "Could not find the specified user" });
        }

        const hashedPassword = helpers.hash(password);
        if (hashedPassword !== userData.hashedPassword) {
          return callback(400, {
            Error:
              "Password did not match the specified user's stored password",
          });
        }

        const tokenId = helpers.createRandomString(20);
        const expires = Date.now() + 1000 * 60 * 60;
        tokenObject = {
          email,
          id: tokenId,
          expires,
        };

        return _data.create("tokens", tokenId, tokenObject);
      },
      (err) => {
        callback(400, { Error: "Could not find the specified user" });
      }
    )
    .then(
      () => {
        return callback(200, tokenObject);
      },
      (err) => {
        console.log(err);
        callback(500, { Error: "Could not create the new token" });
      }
    );
};

handlers._tokens.get = function (data, callback) {
  const id =
    typeof data.queryStringObject.id === "string" &&
    data.queryStringObject.id.trim().length === 20
      ? data.queryStringObject.id.trim()
      : false;

  if (id) {
    return callback(400, { Error: "Missing required field" });
  }

  _data
    .read("tokens", id)
    .then(function (err, tokenData) {
      if (!tokenData) {
        return callback(404);
      }

      callback(200, tokenData);
    })
    .catch((err) => {
      callback(404);
    });
};

handlers._tokens.put = function (data, callback) {
  const id =
    typeof data.payload.id === "string" && data.payload.id.trim().length === 20
      ? data.payload.id.trim()
      : false;

  const extend =
    typeof data.payload.extend === "boolean" && data.payload.extend === true
      ? true
      : false;

  if (!(id && extend)) {
    return callback(400, {
      Error: "Missing required field(s) or fields(s) are invalid",
    });
  }

  _data
    .read("tokens", id)
    .then(
      function (tokenData) {
        if (!tokenData) {
          return callback(400, { Error: "Specified token does not exist" });
        }

        if (!(tokenData.expires > Date.now())) {
          return callback(400, {
            Error: "The token has already expired, and cannot be extended ",
          });
        }

        tokenData.expires = Date.now() + 1000 * 60 * 60;
        return _data.update("tokens", id, tokenData);
      },
      (err) => {
        callback(400, { Error: "Specified token does not exist" });
      }
    )
    .then(
      () => {
        callback(200);
      },
      (err) => {
        callback(500, {
          Error: "Could not update the token's expiration",
        });
      }
    );
};

handlers._tokens.delete = function (data, callback) {
  const id =
    typeof data.queryStringObject.id === "string" &&
    data.queryStringObject.id.trim().length === 20
      ? data.queryStringObject.id.trim()
      : false;

  if (!id) {
    callback(400, { Error: "Missing required field" });
  }

  _data
    .read("tokens", id)
    .then(
      (data) => {
        if (!data) {
          return callback(400, { Error: "Could not find specified token" });
        }

        return _data.delete("tokens", id);
      },
      function (err) {
        callback(400, { Error: "Could not find specified token" });
      }
    )
    .then(
      () => {
        callback(200);
      },
      (err) => {
        callback(500, { Error: "Could not delete the specified token" });
      }
    );
};

handlers._tokens.verifyToken = function (id, email, callback) {
  _data
    .read("tokens", id)
    .then((tokenData) => {
      if (!tokenData) {
        return callback(false);
      }

      if (tokenData.email === email && tokenData.expires > Date.now()) {
        callback(true);
      } else {
        callback(false);
      }
    })
    .catch((err) => {
      callback(false);
    });
};

handlers.notFound = function (data, callback) {
  callback(404);
};

export const router = {
  users: handlers.users,
  tokens: handlers.tokens,
};
