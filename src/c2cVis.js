const cheerio = require("cheerio");
const d3 = require("d3");
const wiki = require("./mediawiki");

const samplejson = require("../sample/aikatsu.json");
const sampleURL = "https://ja.wikipedia.org/wiki/%E3%82%A2%E3%82%A4%E3%82%AB%E3%83%84!%E3%81%AE%E7%99%BB%E5%A0%B4%E4%BA%BA%E7%89%A9%E4%B8%80%E8%A6%A7";

const parseCharaList = function (wikijson) {
  const rowHTML = Object.keys(wikijson["query"]["pages"])
    .map(function (key) {
      return wikijson["query"]["pages"][key];
    })[0]["revisions"][0]["*"];

  const $ = cheerio.load(rowHTML);
  const ret = [];
  let category = 0;
  $("dl").each(function () {
    $(this).children("dt").each(function () {
      const name = $(this).text().replace(/[\(（].+?[\)）：]/g, "")
        .replace(/\[.+?\]/g, "").trim();
      const splitName = name.split(/[\s、,・=＝]/);
      const nameURL = $(this).find("a").attr("href");
      const text = $(this).nextUntil("dt", "dd").not(".reference").text();
      if (name === "") return;
      ret.push({
        "name": name,
        "splitName": splitName,
        "nameURL": nameURL,
        "text": text,
        "relation": [],
        "relateionCnt": 0,
        "categoroy": category
      });
    })
    if ($(this).next().not("dl").length > 0) {
      category++;
    }
  });
  countCharaRelation(ret);
  return ret;
}

const countCharaRelation = function (charaList) {
  charaList.forEach(function (chara, i, arr) {
    chara["relation"] = [];
    charaList.forEach(function (other) {
      if (other.name == chara.name) return;
      const cnt = other.splitName.reduce(function (a, b) {
        const _cnt = (chara.text.match(new RegExp(b, "g")) || []).length;
        return a + _cnt;
      }, 0);
      if (cnt > 0) {
        chara.relation.push({ "name": other.name, "count": cnt });
        // other.relation.push({ "name": chara.name, "count": cnt });
      }
    })
    chara.relateionCnt = chara.relation.reduce((a, b) => {
      return a + b.count;
    }, 0)
  })
}

const limitCharacter = function (charaList, minRelation) {
  const oldCategoryArr = [];
  let limited = JSON.parse(JSON.stringify(charaList));
  limited = limited
    .filter(function (chara) {
      return chara.relateionCnt > minRelation;
    });
  countCharaRelation(limited);

  const charaDict = {};
  limited.forEach(function (chara) {
    if (chara.relation.length > 0) {
      charaDict[chara.name] = 1;
      chara.relation.forEach(function (r) {
        charaDict[r.name] = 1;
      })
    }
  });
  const linkedChara = Object.keys(charaDict);
  limited = limited.filter(function (chara) {
    if (linkedChara.indexOf(chara.name) === -1) {
      return false;
    }
    return true;
  })

  limited.forEach(function (chara) {
    let newCat = oldCategoryArr.indexOf(chara.categoroy);
    if (newCat === -1) {
      newCat = oldCategoryArr.push(chara.categoroy) - 1;
    }
    chara.category = newCat;
  });

  return limited;
}

const orderStringByCode = function (_str1, _str2) {
  const str1 = new String(_str1);
  const str2 = new String(_str2);
  const len = Math.min(str1.length, str2.length);
  for (let i = 0; i < len; i++) {
    let code1 = str1.charCodeAt(i);
    let code2 = str2.charCodeAt(i);
    if (code1 === code2) {
      continue;
    } else if (code1 < code2) {
      return [str1, str2];
    } else {
      return [str2, str1];
    }
  }
  return [str1, str2];
}

const summarizeLink = function (charaList) {
  const linksObj = {};
  charaList
    .forEach(function (chara) {
      chara.relation
        .forEach(function (relateTo) {
          if (relateTo.count == 0) return;
          const srcAndTgt = orderStringByCode(chara.name, relateTo.name);
          const src = srcAndTgt[0];
          const tgt = srcAndTgt[1];
          if (!linksObj[src]) linksObj[src] = {};
          if (!linksObj[src][tgt]) linksObj[src][tgt] = 0;
          linksObj[src][tgt] += relateTo.count;
        });
    });
  const links = [];
  Object.keys(linksObj).forEach(function (srckey) {
    Object.keys(linksObj[srckey]).forEach(function (tgtkey) {
      links.push({
        "source": srckey,
        "target": tgtkey,
        "value": linksObj[srckey][tgtkey]
      });
    })
  })
  return links;
}


///////////////////////////////////////
// draw svg
///////////////////////////////////////
const drawGraph = function (charaList, links) {
  const svg = d3.select("svg");
  svg.selectAll("*").remove();
  const width = svg.attr("width");
  const height = svg.attr("height");

  const container = svg
    .append("g").attr("class", "container");

  const categoryColor = d3.scaleOrdinal(d3.schemeCategory20);

  const linkStrength = d3.scalePow()
    .exponent(0.5)
    .domain([0, Math.max.apply(null, links.map(function (d) { return d.value; }))])
    .range([0, 0.5]);;

  const simulation = d3.forceSimulation()
    .force("link", d3.forceLink()
      .id(function (d) { return d.name; })
      .strength(function (d) { return linkStrength(d.value); }))
    .force("charge", d3.forceManyBody())
    .force("center", d3.forceCenter(width / 2, height / 2));

  const d3link = container.append("g")
    .attr("class", "links")
    .selectAll("line")
    .data(links)
    .enter().append("line")
    .attr("stroke", "rgba(0, 0, 0, 0.2)")
    .attr("stroke-width", function (d) { return linkStrength(d.value) * 5; });

  const d3node = container.append("g")
    .attr("class", "nodes")
    .selectAll(".node")
    .data(charaList)
    .enter().append("g").attr("class", "node");
  d3node.append("circle")
    .attr("r", 2).attr("fill", function (d) {
      return categoryColor(d.categoroy);
    });

  d3node.append("text")
    .attr("font-size", "4")
    .attr("fill", "#aa33ee")
    .text(function (d) { return d.name; });

  simulation.nodes(charaList)
    .on("tick", ticked);

  simulation.force("link")
    .links(links);

  function ticked() {
    d3link
      .attr("x1", function (d) { return d.source.x; })
      .attr("y1", function (d) { return d.source.y; })
      .attr("x2", function (d) { return d.target.x; })
      .attr("y2", function (d) { return d.target.y; });

    d3node
      .attr("transform", function (d) {
        return "translate(" + d.x + "," + d.y + ")";
      });

    svg.attr("viewBox", function () {
      const bbox = container.node().getBBox();
      return bbox.x + ", " + bbox.y + ", " + bbox.width + ", " + bbox.height;
    });
  }
};

// set the range of the depth-adjusting slidbar
const setThRange = function (max, init) {
  d3.select("#thRange")
    .attr("min", "1")
    .attr("max", max)
    .attr("value", init)
    .attr("step", "0.1");
  d3.select("#thOutput")
    .text(init);
}

let _charaList;
let limitedCharaList;
let links;

const init = (json, threshold = undefined) => {
  _charaList = parseCharaList(json);

  const depth = Math.max(..._charaList.map(chara => chara.relateionCnt));
  console.log('depth', depth);
  const sqrtDepth = Math.floor(Math.sqrt(depth));
  if (!threshold) {
    threshold = Math.floor((1 + sqrtDepth) / 2);
  }
  setThRange(sqrtDepth, threshold);
  limitedCharaList = limitCharacter(_charaList, threshold ** 2);
  links = summarizeLink(limitedCharaList);
  drawGraph(limitedCharaList, links);
}

d3.select("#btn_load").on("click", function () {
  const url = d3.select("#input_url").property("value");
  const json = wiki.fetchJson(url)
    .then(init, (err) => alert(err));
});

d3.select("#btn_thChg").on("click", function () {
  const newDepth = Number(d3.select("#thOutput").text()) ** 2;
  limitedCharaList = limitCharacter(_charaList, newDepth);
  links = summarizeLink(limitedCharaList);
  drawGraph(limitedCharaList, links);
})

d3.select("#input_url").on("input", () => {
  const inputStr = d3.select("#input_url").property("value");
  let outputStr = "";
  try {
    outputStr = decodeURI(inputStr);
  }
  catch (e) {
    outputStr = "invalid URL";
  }
  d3.select("#output_url")
    .text(decodeURI(outputStr));
});


init(samplejson, 2.8);
d3.select("#input_url")
  .property("value", sampleURL);
d3.select("#output_url")
  .text(decodeURI(sampleURL));