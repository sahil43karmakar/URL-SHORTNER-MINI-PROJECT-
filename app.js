/* ==========================================================
   IMPORTS
========================================================== */

// readFile → used to read data from file
// writeFile → used to save data into file
import { readFile, writeFile } from "fs/promises";

// creates HTTP server (without Express)
import { createServer } from "http";

// helps safely create file paths
import path from "path";

// used to generate random short codes
import crypto from "crypto";


/* ==========================================================
   BASIC SETTINGS
========================================================== */

// server will run on this port
const port = 3002;

// location of our JSON database file
// data/url.json will store all shortened URLs
const FILE_NAME = path.join("data", "url.json");


/* ==========================================================
   FUNCTION: SERVE STATIC FILE (HTML / CSS)
========================================================== */
const serveFile = async (res, filePath, contentType) => {
  try {
    // read file from computer
    const data = await readFile(filePath);

    // send success response
    res.writeHead(200, { "Content-Type": contentType });

    // send file to browser
    res.end(data);
  } catch (error) {
    // if file not found
    res.writeHead(404);
    res.end("404 page not found");
  }
};


/* ==========================================================
   FUNCTION: LOAD LINKS (READ DATABASE)
========================================================== */
// const loadLinks = async () => {
//   try {
//     // read json file as text
//     const data = await readFile(FILE_NAME, "utf-8");

//     // convert text → javascript object
//     return JSON.parse(data);

//   } catch (error) {

//     // if file doesn't exist
//     if (error.code === "ENOENT") {

//       // create empty database file
//       await writeFile(FILE_NAME, JSON.stringify({}));

//       // return empty object
//       return {};
//     }

//     throw error;
//   }
// };
const loadLinks = async () => {
  try {
    const data = await readFile(FILE_NAME, "utf-8");

    // if file exists but empty
    if (!data || !data.trim()) {
      return {};
    }

    return JSON.parse(data);

  } catch (error) {
    if (error.code === "ENOENT") {
      await writeFile(FILE_NAME, JSON.stringify({}));
      return {};
    }
    throw error;
  }
};


/* ==========================================================
   FUNCTION: SAVE LINKS (WRITE DATABASE)
========================================================== */
const saveLinks = async (links) => {

  /*
  links is an OBJECT (mini database)

  Example structure:

  {
    "abc123": "https://google.com",
    "yt999": "https://youtube.com"
  }

  KEY   → short code
  VALUE → real website URL
  */

  await writeFile(FILE_NAME, JSON.stringify(links, null, 2));
};


/* ==========================================================
   CREATE SERVER
========================================================== */
const server = createServer(async (req, res) => {

  /* ================= GET REQUEST ================= */
  if (req.method === "GET") {

    // open homepage
    if (req.url === "/") {
      return serveFile(
        res,
        path.join("public", "index.html"),
        "text/html"
      );
    }

    // load css styling
    if (req.url === "/style.css") {
      return serveFile(
        res,
        path.join("public", "style.css"),
        "text/css"
      );
    }
    //when user calls the api called /links ,then from database we will get all the short code and real url pairs and send it to frontend so that frontend can show all the shortened urls in list in index.html fetchShotenedUrls function
    else if (req.url === "/links") {
      //below line we are calling loadLinks function to get all the short code and real url pairs from database and store it in links variable and then we will send this links variable to frontend in form of JSON string
      const links = await loadLinks();
      res.writeHead(200, { "Content-Type": "application/json" });
      //we need to send data in form of text to frontend because http can only read text data so we are converting our links object into JSON string using JSON.stringify() and sending it to frontend
      return res.end(JSON.stringify(links));
    }
    //we will do redirection work,means when user visits localhost:3002/abc123 then we will check in database that abc123 short code exist or not if exist then we will redirect user to real website which is stored in database against that short code
    else{
      //below url is like localhost:3002/abc123 ,so we are removing "/" from url using slice method and getting short code from url and then checking in database that this short code exist or not if exist then we will redirect user to real website which is stored in database against that short code
      //url is not the html url but it is the url which user is visiting in browser like localhost:3002/abc123 ,so we are removing "/" from url using slice method and getting short code from url and then checking in database that this short code exist or not if exist then we will redirect user to real website which is stored in database against that short code
        const links = await loadLinks();
        const shortCode = req.url.slice(1); //reomving "/" from url using slice method and getting short code from url
        if(links[shortCode]){  //that menas short code exist in database and we have real url stored against that short code in database then we will redirect user to real website which is stored in database against that short code "abd":"https://google.com" ,so if user visits localhost:3002/abc then we will check in database that abc short code exist or not if exist then we will redirect user to real website which is stored in database against that short code
          //req.url gives output as :`/abc123` ,so we are removing "/" from url using slice method and getting short code from url'
          console.log("Short code found in database. Redirecting to real URL...",req.url);
          res.writeHead(302,{location: links[shortCode]});
          return res.end();
        }
    }

    /* -------- URL REDIRECTION LOGIC -------- */

    // load all stored links
    const links = await loadLinks();
     //links is an object which contains all the short code and real url pairs stored in our JSON file(database)
    // remove "/" from URL
    // "/abc123" → "abc123"
    const shortCode = req.url.slice(1);

    /*
    links object works like a DICTIONARY:

    links = {
      "abc123": "https://google.com"
    }

    If user visits:
    localhost:3002/abc123
    "abc123" is short code
    then:
    links["abc123"] gives original URL
    */

    if (links[shortCode]) {
      // redirect browser to real website
      res.writeHead(302, {
        Location: links[shortCode],
      });

      return res.end();
    }

    res.writeHead(404);
    return res.end("Short URL not found");
  }


  /* ================= POST REQUEST ================= */
  if (req.method === "POST" && req.url === "/shorten") {

    // load existing database
    const links = await loadLinks();

    // body arrives in small pieces (chunks)
    let body = "";

    // collect chunks,of data 
    req.on("data", (chunk) => {
      body += chunk;
    });

    // when complete data received
    req.on("end", async () => {

      // convert JSON text → object
      //below line we do destructuring to get url and shortCode from the body which is coming from client/frontend
      //url and shortcode are id and name attribute of input field in index.html
     //url and shortoce ko object me convert kar rahe hain taki hum url aur shortCode ko alag alag variable me store kar sake
      const { url, shortCode } = JSON.parse(body);

      // validation
      //if url field is empty then send error response to user else continue with rest of the code
      if (!url) {
        res.writeHead(400);
        return res.end("URL is required");
      }
          //keeping sortcode inside finalShortCode variable because we will use it later to save in database and send response to user,and check for dupliacte
      // generate random shortcode if user didn't provide
      //(final shortcode decided by server on condton given by user) → original URL
      //shortCode        = user choice
     // finalShortCode   = server decision

      const finalShortCode =
        shortCode || crypto.randomBytes(4).toString("hex");

      // avoid duplicate shortcode
      if (links[finalShortCode]) {
        res.writeHead(400);
        return res.end("Shortcode already exists");
      }

      /*
      ===================================================
      MOST IMPORTANT LINE
      ===================================================

      links["abc123"] = "https://google.com"

      Explanation:

      links → object (mini database)

      "abc123" → KEY (short name)
      "https://google.com" → VALUE (real website)

      Like phonebook:
      Rahul → 99999

      After storing:
      {
        abc123: "https://google.com"
      }
      */
      //below in url id ,we are assigning the url id in index.html to the url variable and in shortCode variable we are assigning the shortCode id in index.html to it
      links[finalShortCode] = url;

      // save updated database
      await saveLinks(links);

      // send shortened URL back to browser
      res.writeHead(200, { "Content-Type": "application/json" });

      res.end(
        JSON.stringify({
          shortUrl: `http://localhost:${port}/${finalShortCode}`,
        })
      );
    });
  }
});


/* ==========================================================
   START SERVER
========================================================== */
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});


/* ==========================================================
   WHAT HAPPENS STEP BY STEP (NON-CODER VIEW)

   1. User opens website → homepage loads.
   2. User enters long URL.
   3. Server creates short code.
   4. Saves mapping in JSON file.
   5. When short link is opened →
      server finds real URL and redirects.
========================================================== */


 // JSON string ko JS object me convert kar rahe hain
    // { url, shortCode } client/frontend  se aata hai jo use ne jo input diya
//     const url = req.body.url;
// const shortCode = req.body.shortCode;
// OR WE CAN WRITE IN ONE LINE AS BELOW