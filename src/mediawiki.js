var request = require('browser-request');

const fetchJson = function (wikiURL, originURL = undefined) {
  return new Promise((resolve, reject) => {
    console.log(wikiURL);
    const title = wikiURL.match(/\/([^\/]+?)$/)[1];
    let urlDomain;
    if (originURL) {
      urlDomain = originURL.match(/(https:\/\/..\.wikipedia.org)/)[1];
    } else {
      urlDomain = wikiURL.match(/(https:\/\/..\.wikipedia.org)/)[1];
    }

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

const fetchHTML = async (wikiURL, originURL = undefined, json = undefined) => {
  let id = null;
  if (!json) {
    id = wikiURL.match(/#([^#]+?)$/);
    id = id ? id[1] : id;
    const _wikiURL = id ? wikiURL.slice(0, -1 * (1 + id.length)) : wikiURL;
    json = await fetchJson(_wikiURL, originURL);
  }
  let rowHTML = Object.keys(json["query"]["pages"])
    .map(function (key) {
      return json["query"]["pages"][key];
    })[0]["revisions"][0]["*"];

  // if (id !== null) {
  //   const parser = new DOMParser();
  //   const doc = parser.parseFromString(rowHTML, "text/html");
  //   console.log(doc.getElementById(id));
  //   rowHTML = doc.getElementById(id).innerHTML;
  // }
  return rowHTML;
};

module.exports = {
  fetchJson: fetchJson,
  fetchHTML: fetchHTML
}
// fetchJson("https://ja.wikipedia.org/wiki/%E3%82%A2%E3%82%A4%E3%82%AB%E3%83%84!%E3%81%AE%E7%99%BB%E5%A0%B4%E4%BA%BA%E7%89%A9%E4%B8%80%E8%A6%A7")
