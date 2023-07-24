const express = require("express");
const app = express();
module.exports = app;
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dbpath = path.join(__dirname, "covid19IndiaPortal.db");
let db = null;
app.use(express.json());
const intailizedbserver = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("server has been started");
    });
  } catch (e) {
    console.log(`db error is ${e.message}`);
    process.exit(1);
  }
};

intailizedbserver();
const authtoken = (request, response, next) => {
  let jwtToken;
  const authheader = request.headers["authorization"];
  jwtToken = authheader.split(" ")[1];
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};
app.post("/login/", async (request, response) => {
  try {
    const { username, password } = request.body;
    const checkquery = `select * from user where username='${username}'`;
    const dbuser = await db.get(checkquery);
    if (dbuser === undefined) {
      response.status(400);
      response.send("Invalid user");
    } else {
      const ispasswordmatched = await bcrypt.compare(password, dbuser.password);
      if (ispasswordmatched) {
        const payload = username;
        const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
        response.send({ jwtToken });
      } else {
        response.status(400);
        response.send("Invalid password");
      }
    }
  } catch (e) {
    console.log(`login error is ${e.message}`);
  }
});
app.get("/states/", authtoken, async (request, response) => {
  try {
    const allquery = `select 
            state_id as stateId,state_name as stateName ,population
            from state 
            order by 
            state_id`;
    const getarray = await db.all(allquery);
    response.send(getarray);
  } catch (e) {
    console.log(`db error is ${e.message}`);
  }
});

app.get("/states/:stateId/", authtoken, async (request, response) => {
  try {
    const { stateId } = request.params;
    const getquery = `select 
            state_id as stateId,state_name as stateName ,population
            from state 
            where 
            state_id=${stateId}`;
    const getarray = await db.get(getquery);
    response.send(getarray);
  } catch (e) {
    console.log(`db error is ${e.message}`);
  }
});

app.post("/districts/", authtoken, async (request, response) => {
  const bodydetails = request.body;
  const { districtName, stateId, cases, cured, active, deaths } = bodydetails;
  const createquery = `
    insert into   
    district (district_name,state_id,cases,cured,active,deaths)
    values(
        '${districtName}',
        ${stateId},
        ${cases},
        ${cured},
        ${active},
        ${deaths}
        )`;
  await db.run(createquery);
  response.send("District Successfully Added");
});

app.get("/districts/:districtId/", authtoken, async (request, response) => {
  const { districtId } = request.params;
  const getdisquery = `select  district_id as districtId,district_name as districtName,
  state_id as stateId,cases,cured,active,deaths from district
  where district_id=${districtId}`;
  const disarray = await db.get(getdisquery);
  response.send(disarray);
});

app.delete("/districts/:districtId/", authtoken, async (request, response) => {
  const { districtId } = request.params;
  const delquery = `
    delete 
    from district 
    where 
    district_id=${districtId};`;
  await db.run(delquery);
  response.send("District Removed");
});

app.put("/districts/:districtId/", authtoken, async (request, response) => {
  const { districtId } = request.params;
  const bodydetails = request.body;
  const { districtName, stateId, cases, cured, active, deaths } = bodydetails;
  const updatequery = `update 
    district 
    set 
    district_name='${districtName}',
    state_id=${stateId},
    cases=${cases},
    cured=${cured},
    active=${active},
    deaths=${deaths}
    where 
    district_id=${districtId}`;
  await db.run(updatequery);
  response.send("District Details Updated");
});

app.get("/states/:stateId/stats/", authtoken, async (request, response) => {
  const { stateId } = request.params;
  const getelequery = `select
  sum(cases) as totalCases,
  sum(cured) as totalCured,
  sum(active) as totalActive,
  sum(deaths) as totalDeaths 
   from 
      district 
      where 
      state_id=${stateId}`;
  const getdistrictdetails = await db.get(getelequery);
  response.send(getdistrictdetails);
});
