// Settings
var pageW = window.innerWidth;
var pageH = window.innerHeight;

var canvas = document.getElementById("maze");
var ctx = this.canvas.getContext("2d");

var r = document.querySelector(':root');
var rs = getComputedStyle(r);
var bccolor = rs.getPropertyValue("--bccolor");
var maincolor = rs.getPropertyValue("--maincolor");

var canvasSize = 600;

var mazeWidth = 2;
var mazeHeigth = 2;

var cellSize = 600/mazeWidth;

// Global variables
var grid = [];

// Generating
var stack = [];
var generated = false;

var start = null;
var end = null;

// Solving
var openSet = [];
var closedSet = [];

var path = [];

// Responsive
var maze = document.getElementById("maze");
var container = document.getElementById("container");

function reportWindowSize() {
    if (window.innerWidth < window.innerHeight)
    {
        if (1.45*window.innerWidth < window.innerHeight) {
            maze.style.width = "87%";
            container.style.width = "50%";
        }
        else {
            let per = Math.floor(50*(window.innerHeight / window.innerHeight));
            maze.style.width = per.toString() + "%";
            container.style.width = per.toString() + "%";
        }
    }
    else {
        if (window.innerHeight < 0.53*window.innerWidth) {
            let per = Math.floor(100*(window.innerHeight / window.innerWidth)) - 3;
            console.log("Kurwa");
            maze.style.width = per.toString() + "%";
            container.style.width = per.toString() + "%";
        }
        else {
            maze.style.width = "45%";
            container.style.width = "45%";
        }
    }
    
}

reportWindowSize()
window.onresize = reportWindowSize;


function drawLine(x1, y1, x2, y2, style = bccolor) {
    ctx.beginPath();
    ctx.strokeStyle = style;
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

function drawCircle(pos, style = bccolor) {
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, cellSize/3, 0, 2 * Math.PI);
    ctx.fillStyle = style;
    ctx.fill();
}

function removeCircle(pos, style = bccolor) {
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, cellSize/2.5, 0, 2 * Math.PI);
    ctx.fillStyle = style;
    ctx.fill();
}

function clear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

class Vec2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

class EndPoint {
    constructor(x, y) {
        this.gridPos = new Vec2(x, y);
        this.pos = new Vec2(cellSize*x + cellSize/2, cellSize*y + cellSize/2);
        this.color = "red";
    }
    
    draw () {
        drawCircle(this.pos, this.color);
    }

    moveTo(x, y) {
        this.gridPos.x = x;
        this.gridPos.y = y;

        this.pos.x = cellSize*this.gridPos.x + cellSize/2;
        this.pos.y = cellSize*this.gridPos.y + cellSize/2;
    }
}

class Player {
    constructor(x, y) {
        this.gridPos = new Vec2(x, y);
        this.pos = new Vec2(cellSize*x + cellSize/2, cellSize*y + cellSize/2);
        this.oldpos = new Vec2(-100, -100);
        this.color = "white";
    }

    draw(generating = false) {
        if (generating) {
            drawCircle(this.pos, this.color);
            this.oldpos.x = this.pos.x;
            this.oldpos.y = this.pos.y;
        }
        else {
            removeCircle(this.oldpos, maincolor);
            drawCircle(this.pos, this.color);
            this.oldpos.x = this.pos.x;
            this.oldpos.y = this.pos.y;
        }
        
    }

    move(x, y) {
        this.gridPos.x += x;
        this.gridPos.y += y;

        this.pos.x = cellSize*this.gridPos.x + cellSize/2;
        this.pos.y = cellSize*this.gridPos.y + cellSize/2;

        this.draw();
    }

    moveTo(x, y) {
        this.gridPos.x = x;
        this.gridPos.y = y;

        this.pos.x = cellSize*this.gridPos.x + cellSize/2;
        this.pos.y = cellSize*this.gridPos.y + cellSize/2;
    }
}

// Player
var player = new Player(0, 0);
var endPoint = new EndPoint(0, 0);

class Cell {
    constructor(x, y) {
        this.gridPos = new Vec2(x, y);
        this.pos = new Vec2(x * cellSize, y * cellSize);
        this.neighbors = [];

        this.top = false;
        this.bot = false;
        this.right = false;
        this.left = false;

        this.visit = false;

        // Solving
        this.f = 0;
        this.h = 0;
        this.g = 0

        this.previous = null;
    }

    addNeighbor(cell) {
        this.neighbors.push(cell);

        if (cell.gridPos.x > this.gridPos.x && cell.gridPos.y == this.gridPos.y) {
            this.right = true;
        }     
        else if (cell.gridPos.x < this.gridPos.x && cell.gridPos.y == this.gridPos.y) {
            this.left = true;
        }      
        else if (cell.gridPos.x == this.gridPos.x && cell.gridPos.y > this.gridPos.y) {
            this.bot = true;
        }    
        else if (cell.gridPos.x == this.gridPos.x && cell.gridPos.y < this.gridPos.y) {
            this.top = true;
        }
                
    }

    draw() {
        if(!this.top) {
            drawLine(this.pos.x, this.pos.y, this.pos.x + cellSize, this.pos.y);
        }
        if(!this.bot) {
            drawLine(this.pos.x, this.pos.y + cellSize, this.pos.x + cellSize, this.pos.y + cellSize);
        }
        if(!this.right) {
            drawLine(this.pos.x + cellSize, this.pos.y, this.pos.x + cellSize, this.pos.y + cellSize);
        }
        if(!this.left) {
            drawLine(this.pos.x, this.pos.y, this.pos.x, this.pos.y + cellSize);
        }
    }
}

function drawPath() {
    let from = new Vec2();
    let to = null;
    for (let x = 0; x < path.length; ++x) {
        if (x == 0) {
            from = path[x].pos;
            //drawLine(from.x + cellSize/2, from.y + cellSize/2, mazeWidth*cellSize, mazeHeigth*cellSize - cellSize/2, "red");
        }
        else {
            to = path[x].pos;
            drawLine(from.x + cellSize/2, from.y + cellSize/2, to.x + cellSize/2, to.y + cellSize/2, "red");
            from = path[x].pos;
        }
    }
    //drawLine(from.x + cellSize/2, from.y + cellSize/2, 0, cellSize/2, "red");
}

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

function heuristics(neighbor, end) {
    let x_dif = Math.abs(neighbor.gridPos.x - end.gridPos.x);
    let y_dif = Math.abs(neighbor.gridPos.y - end.gridPos.y);

    return Math.sqrt(Math.pow(x_dif, 2) + Math.pow(y_dif, 2));
}
  

function checkNeighRand(gridPos) {
    let temp = [];

    if (gridPos.y - 1 >= 0) {
        if (!grid[gridPos.x][gridPos.y - 1].visit) {
            temp.push(grid[gridPos.x][gridPos.y - 1]);
        }
        
    }
    if (gridPos.y + 1 < mazeHeigth) {
        if (!grid[gridPos.x][gridPos.y + 1].visit) {
            temp.push(grid[gridPos.x][gridPos.y + 1]);
        }
    }
    if (gridPos.x - 1 >= 0) {
        if (!grid[gridPos.x - 1][gridPos.y].visit) {
            temp.push(grid[gridPos.x - 1][gridPos.y]);
        }
    }
    if (gridPos.x + 1 < mazeWidth) {
        if (!grid[gridPos.x + 1][gridPos.y].visit) {
            temp.push(grid[gridPos.x + 1][gridPos.y]);
        }
    }

    if (temp.length == 0) {
        return 0;
    }

    return temp[getRandomInt(temp.length)];
    
}

function setEnd() {
    if (getRandomInt(2) == 1) {
        end = grid[mazeWidth - 1][getRandomInt(mazeHeigth)];
    }
    else {
        end = grid[getRandomInt(mazeWidth)][mazeHeigth - 1];
    }
}

function generate() {
    clear();
    grid = [];
    stack = [];
    openSet = [];
    closedSet = [];
    path = [];


    // Generating grid
    let row = [];
    for (let i = 0; i < mazeWidth; ++i) {
        row = [];
        for (let j = 0; j < mazeHeigth; ++j) {
            row.push(new Cell(i, j));
        }
        grid.push(row);
    }

    // Settings for generating maze
    stack.push(grid[0][0]);
    grid[0][0].visit = true;

    // Generating maze
    while (stack.length > 0) {
        let current = stack.pop();

        let next = checkNeighRand(current.gridPos);
        if (next != 0) {
            stack.push(current);
            current.addNeighbor(next);
            next.addNeighbor(current);
            next.visit = true;
            stack.push(next);
        }
        else {
            current.visit = true;
        }
    }

    // Drawing maze
    for (let i = 0; i < grid.length; ++i) {
        for (let j = 0; j < grid[i].length; ++j) {
            grid[i][j].draw();
        }
    }

    // Settings for solving maze
    start = grid[0][0];
    //end = grid[mazeWidth-1][mazeHeigth - 1];
    setEnd();
    generated = true;

    endPoint.moveTo(end.gridPos.x, end.gridPos.y);
    endPoint.draw();
    player.moveTo(0, 0);
    player.draw(true);
}

generate();

function solve() {
    if (!generated) {
        return;
    }

    openSet = [];
    closedSet = [];
    path = [];

    openSet.push(start);

    while (openSet.length > 0) {
        let winner = 0;

        for (let i = 0; i < openSet.length; ++i) {
            if (openSet[i].f < openSet[winner].f) {
                winner = i;
            }
        }

        let current = openSet[winner];

        if (current == end) {
            openSet = [];
            //console.log("Done!");

            let temp = current;
            path.push(temp);
            while (temp.previous) {
                path.push(temp.previous);
                temp = temp.previous;
            }
        }

        let index = openSet.indexOf(current);
        openSet.splice(index, 1);
        closedSet.push(current);

        let neighbors = current.neighbors;
        for (let i = 0; i < neighbors.length; ++i) {
            let x = neighbors[i];
            if (closedSet.indexOf(x) == -1) {
                let tempG = current.g + 1;

                if (openSet.indexOf(x) != -1) {
                    if (tempG < x.g) {
                        x.g = tempG;
                    }
                }
                else {
                    x.g = tempG.g;
                    openSet.push(x);
                }

                x.h = heuristics(x, end);
                x.f = x.g + x.h;
                x.previous = current;
            }
        }
    }

    drawPath();
}

function canMove(dir) {
    switch (dir) {
        case "up":
            if (grid[player.gridPos.x][player.gridPos.y].top) {
                return true;
            }
            break;
            
        case "right":
            if (grid[player.gridPos.x][player.gridPos.y].right) {
                return true;
            }
           break;
        
        case "left":
            if (grid[player.gridPos.x][player.gridPos.y].left) {
                return true;
            }
            break;
        
        case "down":
            if (grid[player.gridPos.x][player.gridPos.y].bot) {
                return true;
            }
            break;
           
        default:
            return false;
    }
    return false;
}

function checkWin() {
    if (player.gridPos.x == end.gridPos.x && 
        player.gridPos.y == end.gridPos.y) {
            console.log("Win!");
            mazeWidth += 3;
            mazeHeigth += 3;
            cellSize = 600/mazeWidth;
            generate();
        }
}

function onclickBox(dir) {
    switch (dir) {
        case "up":
            if (canMove("up")) {
                player.move(0, -1);
            }
            break;
            
        case "right":
            if (canMove("right")) {
                player.move(1, 0);
            }
           break;
        
        case "left":
            if (canMove("left")) {
                player.move(-1, 0);
            }
            break;
        
        case "down":
            if (canMove("down")) {
                player.move(0, 1);
            }
            break;
           
        default:
            break;
    }
    checkWin();
}

document.addEventListener('keydown', function(event) {
    switch (event.keyCode) {
        case 38:
            onclickBox("up");
            break;
        case 39:
            onclickBox("right");
            break;
        case 37:
            onclickBox("left");
            break;
        case 40:
            onclickBox("down");
            break;
        default:
            break;
    }
});