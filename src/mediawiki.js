var request = require('browser-request');

const fetchJson = function (wikiURL) {
  return new Promise((resolve, reject) => {
    const title = wikiURL.match(/\/([^\/]+?)$/)[1];
    const urlDomain = wikiURL.match(/(https:\/\/..\.wikipedia.org)/)[1];

    request({
      url: urlDomain + "/w/api.php",
      qs: {
        format: "json",
        action: "query",
        prop: "revisions",
        rvprop: "content",
        rvparse: "",
        titles: decodeURI(title),
        origin: "*"
      },
      headers: {
        // "User-Agent": "c2cVis (kojia1234567890@gmail.com)",
        "Api-User-Agent": "c2cVis (kojia1234567890@gmail.com)"
      }
    }, function (error, response, body) {
      if (error) {
        console.log(error);
        reject(error);
      } else {
        // console.log('body:', body); // Print the HTML.
        resolve(JSON.parse(body));
      }
    });
  });
}
module.exports = {
  fetchJson: fetchJson
}
// fetchJson("https://ja.wikipedia.org/wiki/%E3%82%A2%E3%82%A4%E3%82%AB%E3%83%84!%E3%81%AE%E7%99%BB%E5%A0%B4%E4%BA%BA%E7%89%A9%E4%B8%80%E8%A6%A7")
