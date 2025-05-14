import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const svg = d3.select("svg"),
      margin = {top: 50, right: 50, bottom: 70, left: 80},
      width = +svg.attr("width") - margin.left - margin.right,
      height = +svg.attr("height") - margin.top - margin.bottom,
      g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

const tooltip = d3.select(".tooltip");

const xSelect = d3.select("#xVar");

const x = d3.scaleLinear().range([0, width]);
const y = d3.scaleLinear().range([height, 0]);

const xAxis = g.append("g").attr("transform", `translate(0,${height})`);
const yAxis = g.append("g");

const xLabel = g.append("text")
  .attr("class", "axis-label")
  .attr("text-anchor", "middle")
  .attr("x", width / 2)
  .attr("y", height + 50)
  .text("X Variable");

const yLabel = g.append("text")
  .attr("class", "axis-label")
  .attr("text-anchor", "middle")
  .attr("transform", `rotate(-90)`)
  .attr("x", -height / 2)
  .attr("y", -60)
  .text("Mean QoM (millimeters/second)");

const colors = {
  withMusic: "#1f77b4",     // Blue
  withoutMusic: "#d62728"   // Red
};
const legend = d3.select(".legend");
const title = {
    withMusic: "Subject Experienced Music",     // Blue
    withoutMusic: "Subject Experienced Silence"   // Red
};

for (let d of Object.keys(colors)){
    legend
     .append('li')
     .attr('style', `--color:${colors[d]}`) // set the style attribute while passing in parameters
     .attr('class', 'legend_element')
     .html(`<span class="swatch"></span> ${title[d]}`); // set the inner html of <li>
}

d3.selectAll("input[type='checkbox']").on("change", updateChart);

function calculateRegression(data, xVar, yVar) {
  const n = data.length;
  const meanX = d3.mean(data, d => d[xVar]);
  const meanY = d3.mean(data, d => d[yVar]);
  const sumXY = d3.sum(data, d => (d[xVar] - meanX) * (d[yVar] - meanY));
  const sumX2 = d3.sum(data, d => Math.pow(d[xVar] - meanX, 2));
  const slope = sumXY / sumX2;
  const intercept = meanY - slope * meanX;
  return {slope, intercept};
}

let data = await d3.csv("reports.csv", d3.autoType);

  xSelect.property("value", "Music listening hours/week");

  // Create line placeholders
  const lineWith = g.append("line")
    .attr("stroke", colors.withMusic)
    .attr("stroke-width", 2)
    .attr("opacity", 0.6);

  const lineWithout = g.append("line")
    .attr("stroke", colors.withoutMusic)
    .attr("stroke-width", 2)
    .attr("opacity", 0.6);

  const marker = g.append("circle")
    .attr("r", 5)
    .attr("fill", "black")
    .style("display", "none");

  function updateChart() {
    const locked = document.querySelector("#kneesLocked").checked;
    const closed = document.querySelector("#eyesClosed").checked;
    
    const xVar = xSelect.property("value");
    const yVarWith = "Mean QoM w M";
    const yVarWithout = "Mean QoM w/oM";
    /*
    const filtered = data.filter(d =>
      d[xVar] != null &&
      d[yVarWith] != null &&
      d[yVarWithout] != null 
    );
    */

    const filtered = data.filter(d => {
        const kneeOk =
          (locked && d["Locked knees?"] === 1) ||
          (!locked && d["Locked knees?"] === 0)||
          (d["Locked knees?"] === 0.5);
    
        const eyesOk =
          (closed && d["Eyes open?"] === 1) ||
          (!closed && d["Eyes open?"] === 0)
          ||(d["Eyes open?"] === 0.5);
    
        return kneeOk && eyesOk && (d[xVar] != null) && (d[yVarWith] != null) && (d[yVarWithout] != null);
      });

    x.domain(d3.extent(filtered, d => d[xVar])).nice();
    const yExtent = d3.extent([
      ...filtered.map(d => d[yVarWith]),
      ...filtered.map(d => d[yVarWithout])
    ]);
    y.domain(yExtent).nice();

    xAxis.transition().duration(500).call(d3.axisBottom(x));
    yAxis.transition().duration(500).call(d3.axisLeft(y));

    xLabel.text(xVar);
    
    const pointsWith = g.selectAll(".dot.with").data(filtered, d => d.Subject);
    const pointsWithout = g.selectAll(".dot.without").data(filtered, d => d.Subject);
    pointsWith.join("circle")
        .attr("class", "dot with")
        .attr("r", 5)
        .attr("fill", colors.withMusic)
        .on('mouseenter',(event,d) => {
            tooltip.style("opacity", 0.9)
            tooltip.style("background-color", colors.withMusic)
            tooltip.html(`Subject: ${d.Subject}<br>Group: ${d.Group}<br>${xVar}: ${d[xVar]}<br>Mean QoM With Music: ${d["Mean QoM w M"].toFixed(2)}`);
            tooltip.style("left", (event.clientX + 10) + "px")
            tooltip.style("top", (event.clientY - 20) + "px")
        })
        .on('mouseleave', () => {
            tooltip.style("opacity", 0);
          })
        .transition()
        .duration(500)
        .attr("cx", d => x(d[xVar]))
        .attr("cy", d => y(d[yVarWith]));
        

    
      pointsWithout.join("circle")
      .attr("class", "dot without")
      .attr("r", 5)
      .attr("fill", colors.withoutMusic)
      .on('mouseenter',(event,d) => {
        tooltip.style("opacity", 0.9)
        tooltip.style("background-color", colors.withoutMusic)
        tooltip.html(`Subject: ${d.Subject}<br>Group: ${d.Group}<br>${xVar}: ${d[xVar]}<br>Mean QoM Without Music: ${d["Mean QoM w/oM"].toFixed(2)}`);
        tooltip.style("left", (event.clientX + 10) + "px")
        tooltip.style("top", (event.clientY - 20) + "px")
        })
      .on('mouseleave', () => {
        tooltip.style("opacity", 0);
       })
      .transition()
      .duration(500)
      .attr("cx", d => x(d[xVar]))
      .attr("cy", d => y(d[yVarWithout]));
            


    // Regression lines
    const {slope: m1, intercept: b1} = calculateRegression(filtered, xVar, yVarWith);
    const {slope: m2, intercept: b2} = calculateRegression(filtered, xVar, yVarWithout);

    const [xMin, xMax] = x.domain();
    lineWith.transition().duration(500)
      .attr("x1", x(xMin))
      .attr("y1", y(m1 * xMin + b1))
      .attr("x2", x(xMax))
      .attr("y2", y(m1 * xMax + b1));

    lineWithout.transition().duration(500)
      .attr("x1", x(xMin))
      .attr("y1", y(m2 * xMin + b2))
      .attr("x2", x(xMax))
      .attr("y2", y(m2 * xMax + b2));

/*     
let hoverGroup = g.selectAll(".hover-group").data([null]);
hoverGroup = hoverGroup.enter()
  .append("g")
  .attr("class", "hover-group")
  .merge(hoverGroup);

let diffLine = hoverGroup.selectAll(".diff-line").data([null]);
diffLine = diffLine.enter()
  .append("line")
  .attr("class", "diff-line")
  .attr("stroke", "gray")
  .attr("stroke-dasharray", "4 2")
  .attr("stroke-width", 1.5)
  .style("display", "none")
  .merge(diffLine);

let diffLabel = hoverGroup.selectAll(".diff-label").data([null]);
diffLabel = diffLabel.enter()
  .append("text")
  .attr("class", "diff-label")
  .attr("text-anchor", "middle")
  .attr("fill", "black")
  .style("font-size", "12px")
  .style("background", "white")
  .style("display", "none")
  .merge(diffLabel);

// Transparent rectangle to track mouse
let hoverRect = g.selectAll(".hover-rect").data([null]);
hoverRect = hoverRect.enter()
  .append("rect")
  .attr("class", "hover-rect")
  .attr("width", width)
  .attr("height", height)
  .attr("fill", "transparent")
  .style("pointer-events", "all")
  .merge(hoverRect);

hoverRect
  .on("mousemove", function(event) {
    const [mx] = d3.pointer(event);
    const xVal = x.invert(mx);

    const yWith = m1 * xVal + b1;
    const yWithout = m2 * xVal + b2;

    diffLine
      .attr("x1", x(xVal))
      .attr("x2", x(xVal))
      .attr("y1", y(yWith))
      .attr("y2", y(yWithout))
      .style("display", "block");

    diffLabel
      .attr("x", x(xVal))
      .attr("y", y((yWith + yWithout) / 2) - 10)
      .text(`Predicted Difference in movement with and without music: ${(yWith - yWithout).toFixed(2)}`)
      .style("display", "block")
      .style("background-color","white");
  })
  .on("mouseout", () => {
    diffLine.style("display", "none");
    diffLabel.style("display", "none");
  });
  hoverRect.lower();
*/
  const tooltip2 = d3.select(".diff-tooltip");
  let hoverLine = g.selectAll(".hover-line").data([null]);
  hoverLine = hoverLine.enter()
    .append("line")
    .attr("class", "hover-line")
    .attr("stroke", "gray")
    .attr("stroke-dasharray", "4 2")
    .attr("stroke-width", 1.5)
    .style("display", "none")
    .merge(hoverLine);
  let hoverRect = g.append("rect")
  .attr("width", width)
  .attr("height", height)
  .attr("fill", "transparent")
  .style("pointer-events", "all");
  hoverRect
    .on("mousemove", function(event) {
      const [mx] = d3.pointer(event);
      const xVal = x.invert(mx);
      const yWith = m1 * xVal + b1;
      const yWithout = m2 * xVal + b2;
      const diff = yWith - yWithout;
      const yMid = (yWith + yWithout) / 2;
    // Update vertical line position
    hoverLine
      .attr("x1", x(xVal))
      .attr("x2", x(xVal))
      .attr("y1", y(yWith))
      .attr("y2", y(yWithout))
      .style("display", "block");

    // Position tooltip near the line
    const svgRect = d3.select("svg").node().getBoundingClientRect();
    tooltip2
      .style("left", `${svgRect.left + x(xVal) + margin.left}px`)
      .style("top", `${svgRect.top + y((yWith + yWithout) / 2) + margin.top}px`)
      .style("opacity", 0.95)
      .html(`
        <strong>x:</strong> ${xVal.toFixed(2)}<br/>
        <strong>With Music:</strong> ${yWith.toFixed(2)}<br/>
        <strong>Without Music:</strong> ${yWithout.toFixed(2)}<br/>
        <strong>Diff:</strong> ${diff.toFixed(2)}
      `);
  })
  .on("mouseout", () => {
    tooltip2.style("opacity", 0);
    hoverLine.style("display", "none");
  });
  hoverRect.lower();

}

  xSelect.on("change", updateChart);
  updateChart();


