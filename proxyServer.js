const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');
const https = require('https');
const axios = require('axios');

const PROXY_CONFIGURATION = {
  SSL: {
    // KEY: 'ssl_reactcert/key.pem',
    // CERT: 'ssl_reactcert/cert.pem',
  },
  SERVER: {
    HOST: 'https://localhost',
    PORT: 3690,
  },
  PROXY_SCENARIOS: {
    /***
     * Login redirection to keycloak/localhosted service
     */
    LOGIN: {
      // accept routes on this path regex
      ROUTE_PATTERN: '/auth/*',
      // url to redirect from specific route pattern
      URL: 'https://edpem-dev-backend.compacer.com:28443',
      HEADERS: {
        // 'Access-Control-Allow-Origin': '*', // Required for CORS support to work
        // 'Content-Type': 'application/json',
        'Accept-Encoding': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: '*/*',
      },
      SECRET: {
        client_id: 'edpem-code-flow-client',
        client_secret: '0VewqKK1ycUPKX1Av1L7NdwazvQkzJbM',
      },
    },
    /**
     * Route the request to specific microservice
     */
    TARGET: {
      // acce[t rputes on this path regex]
      ROUTE_PATTERN: '/*',
      // url to redirect from specific route pattern
      URL: 'https://edpem-dev-backend.compacer.com:8822',
      HEADERS: {
        // 'Access-Control-Allow-Origin': '*', // Required for CORS support to work
        'Content-Type': 'application/json',
        'Accept-Encoding': 'application/json',
        Accept: '*/*',
      },
    },
  },
};

const app = express({ PORT: PROXY_CONFIGURATION.SERVER.PORT });
const proxyInstance = ProxyTrigger(PROXY_CONFIGURATION);
const axiosInstance = axios.create();

app.use(helmet());
app.use(cors());
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
/**
 * Route login requests to the specific service
 */
app.all(PROXY_CONFIGURATION.PROXY_SCENARIOS.LOGIN['ROUTE_PATTERN'], (req, res) => {
  console.log('LOGIN PROXY ========== Requested arrived ***');

  proxyInstance.req(
    'LOGIN',
    {
      body: {
        username: req.body.username,
        password: req.body.password,
        client_id: PROXY_CONFIGURATION.PROXY_SCENARIOS.LOGIN.SECRET.client_id,
        client_secret: PROXY_CONFIGURATION.PROXY_SCENARIOS.LOGIN.SECRET.client_secret,
        grant_type: 'password',
      },
    },
    { req, res },
  );
});
/***
 * Route all requests to the specific microservice
 */
app.all(PROXY_CONFIGURATION.PROXY_SCENARIOS.TARGET['ROUTE_PATTERN'], (req, res) => {
  console.log('PROXY ========== Requested arrived ***');

  // Token Need to be hardcoded for now (Seems that when we send new token BE reject it (Check with BE about the implementation of regarding issue))
  // const token = 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJwSEN4Z1E3VHpPOFh0U29nc282dFEwYXFYZTlCQ085ekZVTXIzY0k4aUtZIn0.eyJleHAiOjE2NzUxNjU4OTMsImlhdCI6MTY3NTA3OTQ5MywianRpIjoiOWM0MGUzOTItNWJhOC00ZjkwLWJhODUtNDI4OWNjNzZiZGEwIiwiaXNzIjoiaHR0cHM6Ly9lZHBlbS1kZXYtYmFja2VuZC5jb21wYWNlci5jb206Mjg0NDMvYXV0aC9yZWFsbXMvZWRwZW0iLCJhdWQiOiJhY2NvdW50Iiwic3ViIjoiZTQ1MDQzMDctOWE1MC00NjYzLWE4YWYtMzg5ZmIzZGQwMTYxIiwidHlwIjoiQmVhcmVyIiwiYXpwIjoiZWRwZW0tY29kZS1mbG93LWNsaWVudCIsInNlc3Npb25fc3RhdGUiOiI4ZDViZjAzOS01OGU5LTRhMzYtYWI2Ny0wMTA4MDRhZDczY2IiLCJhY3IiOiIxIiwiYWxsb3dlZC1vcmlnaW5zIjpbImh0dHA6Ly9sb2NhbGhvc3Q6ODA4MyIsImh0dHA6Ly9lZHBlbS1kZXYtYmFja2VuZC5jb21wYWNlci5jb20iLCJodHRwOi8vZWRwZW0tZGV2LWZyb250ZW5kLmNvbXBhY2VyLmNvbSIsImh0dHA6Ly9sb2NhbGhvc3Q6MzAwMCJdLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsiZGVmYXVsdC1yb2xlcy1lZHBlbSIsIm9mZmxpbmVfYWNjZXNzIiwidW1hX2F1dGhvcml6YXRpb24iLCJVU0VSX0FETUlOSVNUUkFUT1IiXX0sInJlc291cmNlX2FjY2VzcyI6eyJhY2NvdW50Ijp7InJvbGVzIjpbIm1hbmFnZS1hY2NvdW50IiwibWFuYWdlLWFjY291bnQtbGlua3MiLCJ2aWV3LXByb2ZpbGUiXX19LCJzY29wZSI6InByb2ZpbGUgZW1haWwiLCJzaWQiOiI4ZDViZjAzOS01OGU5LTRhMzYtYWI2Ny0wMTA4MDRhZDczY2IiLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsInRlbmFudElkIjoiOWU5MjE1M2ItYjY4Zi00YTVkLWJhN2YtMjIzNWI4MWVmZmI4IiwicHJlZmVycmVkX3VzZXJuYW1lIjoidXNlcl9hZG1pbmlzdHJhdG9yIiwiZW1haWwiOiJ1c2VyLmFkbWluaXN0cmF0b3JAY29tcGFjZXIuY29tIn0.sFU1CaYfbqmegjbW55marH7YLwdIB8jL4lOpJGTIWn8AkKi8X_h3xp8N92P7rprJQSi6GM7i6_0-rBZ6tRkFmj9XKWps4R289pjcRWX_JoMPpiAOYPAVKZ-9YiKEbft0i5jY5IHIQf5T75IdO3nMebkGZjb3ASghjPU8ukrgzWUcqs0bHC6OLhCHzs7_4RaN745EZ5LExwwE7FbpajOnvpa07LrixrZdHeKmoqenW14fh53yCri4gudsgD_kz02HXIGKDSToqZLAa6a7HZmOVgKtZpXFX_yfz9SSwZVXSEyDnqVMWyM0yC3J0rMpI8i7XSU9lrdfaJ6wLl0g0TKKRg'
  const token =
    'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJwSEN4Z1E3VHpPOFh0U29nc282dFEwYXFYZTlCQ085ekZVTXIzY0k4aUtZIn0.eyJleHAiOjE2NzUxNjU4OTMsImlhdCI6MTY3NTA3OTQ5MywianRpIjoiOWM0MGUzOTItNWJhOC00ZjkwLWJhODUtNDI4OWNjNzZiZGEwIiwiaXNzIjoiaHR0cHM6Ly9lZHBlbS1kZXYtYmFja2VuZC5jb21wYWNlci5jb206Mjg0NDMvYXV0aC9yZWFsbXMvZWRwZW0iLCJhdWQiOiJhY2NvdW50Iiwic3ViIjoiZTQ1MDQzMDctOWE1MC00NjYzLWE4YWYtMzg5ZmIzZGQwMTYxIiwidHlwIjoiQmVhcmVyIiwiYXpwIjoiZWRwZW0tY29kZS1mbG93LWNsaWVudCIsInNlc3Npb25fc3RhdGUiOiI4ZDViZjAzOS01OGU5LTRhMzYtYWI2Ny0wMTA4MDRhZDczY2IiLCJhY3IiOiIxIiwiYWxsb3dlZC1vcmlnaW5zIjpbImh0dHA6Ly9sb2NhbGhvc3Q6ODA4MyIsImh0dHA6Ly9lZHBlbS1kZXYtYmFja2VuZC5jb21wYWNlci5jb20iLCJodHRwOi8vZWRwZW0tZGV2LWZyb250ZW5kLmNvbXBhY2VyLmNvbSIsImh0dHA6Ly9sb2NhbGhvc3Q6MzAwMCJdLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsiZGVmYXVsdC1yb2xlcy1lZHBlbSIsIm9mZmxpbmVfYWNjZXNzIiwidW1hX2F1dGhvcml6YXRpb24iLCJVU0VSX0FETUlOSVNUUkFUT1IiXX0sInJlc291cmNlX2FjY2VzcyI6eyJhY2NvdW50Ijp7InJvbGVzIjpbIm1hbmFnZS1hY2NvdW50IiwibWFuYWdlLWFjY291bnQtbGlua3MiLCJ2aWV3LXByb2ZpbGUiXX19LCJzY29wZSI6InByb2ZpbGUgZW1haWwiLCJzaWQiOiI4ZDViZjAzOS01OGU5LTRhMzYtYWI2Ny0wMTA4MDRhZDczY2IiLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsInRlbmFudElkIjoiOWU5MjE1M2ItYjY4Zi00YTVkLWJhN2YtMjIzNWI4MWVmZmI4IiwicHJlZmVycmVkX3VzZXJuYW1lIjoidXNlcl9hZG1pbmlzdHJhdG9yIiwiZW1haWwiOiJ1c2VyLmFkbWluaXN0cmF0b3JAY29tcGFjZXIuY29tIn0.sFU1CaYfbqmegjbW55marH7YLwdIB8jL4lOpJGTIWn8AkKi8X_h3xp8N92P7rprJQSi6GM7i6_0-rBZ6tRkFmj9XKWps4R289pjcRWX_JoMPpiAOYPAVKZ-9YiKEbft0i5jY5IHIQf5T75IdO3nMebkGZjb3ASghjPU8ukrgzWUcqs0bHC6OLhCHzs7_4RaN745EZ5LExwwE7FbpajOnvpa07LrixrZdHeKmoqenW14fh53yCri4gudsgD_kz02HXIGKDSToqZLAa6a7HZmOVgKtZpXFX_yfz9SSwZVXSEyDnqVMWyM0yC3J0rMpI8i7XSU9lrdfaJ6wLl0g0TKKRg';

  proxyInstance.req(
    'TARGET',
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    { req, res },
  );
});

function ProxyTrigger(CONFIG) {
  /***
   * activeProxyScenario - tell us about which scenario is executed
   * mutableOptions - contains headers and body for now.
   * pass - contains req,res object from express handler
   */
  const req = (activeProxyScenario, mutableOptions, pass) => {
    const { path, headers, originalUr, url, method, body } = pass.req;

    axiosInstance
      .request({
        url: `${CONFIG.PROXY_SCENARIOS[activeProxyScenario].URL}${url}`,
        headers: {
          ...CONFIG.PROXY_SCENARIOS[activeProxyScenario].HEADERS,
          ...mutableOptions.headers,
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: false,
        }),
        method: method,
        // *POTENTIAL PITFALL !!!!! IF IP have some issue in future
        data: {
          ...body,
          ...mutableOptions.body,
        },
      })
      .then(result => {
        console.log('Response: TRIGGER PROXY ==========');
        pass.res.status(200).send({ ...result.data });
        return;
      })
      .catch(error => {
        if (axios.isAxiosError(error)) {
          console.log('error message: ', error.message);
        } else {
          console.log('unexpected error: ', error);
        }
        //   console.log('unexpected error: ', error);
        pass.res.status(400).send({ error: error.message | error });
      });
  };
  return {
    req,
  };
}

// Starting proxy
https
  .createServer(
    PROXY_CONFIGURATION.SSL['KEY'] && PROXY_CONFIGURATION.SSL['CERT']
      ? {
          key: fs.readFileSync(PROXY_CONFIGURATION.SSL['KEY']),
          cert: fs.readFileSync(PROXY_CONFIGURATION.SSL['CERT']),
        }
      : {},
    app,
  )
  .listen(PROXY_CONFIGURATION.SERVER['PORT'], () => {
    console.log(
      `HTTPS server is up: ${PROXY_CONFIGURATION.SERVER.HOST}:${PROXY_CONFIGURATION.SERVER.PORT}`,
    );
  });
