var game;

var PI = Math.PI;

function choice(obj) {
	var total = 0;
	for(var x in obj) {
		total += Math.sqrt(obj[x]);
	}
	var r = Math.random()*total;
	var s = 0;
	for(var x in obj) {
		s += Math.sqrt(obj[x]);
		if(s>=r) {
			return x;
		}
	}
}

function rad(degrees) {
	return PI*degrees/180;
}
function deg(radians) {
	return 180*radians/PI;
}
function fix_angle(degrees) {
	degrees = degrees % (2*PI);
	if(degrees<-PI) {
		degrees += 2*PI;
	} else if(degrees>PI) {
		degrees -= 2*PI;
	}
	return degrees;
}

function distance(p1,p2) {
	var dx = p1.x-p2.x;
	var dy = p1.y-p2.y;
	return Math.sqrt(dx*dx+dy*dy);
}

function Game(stage,wordlist) {
	var game = this;
	this.stage = stage;
	this.wordlist = wordlist;

	this.g_width = stage.canvas.width;
	this.g_height = stage.canvas.height;

	this.placed_pieces = new Set();
	this.tray_pieces = [];

	var background = this.background = new createjs.Shape();
	stage.addChild(background);

	var world = this.world = new createjs.Container();
	world.regX = -this.g_width/2;
	world.regY = -this.g_height/2;
	stage.addChild(world);

	var offset = new createjs.Point();
	background.on("mousedown",function(e) {
		offset.ox = game.world.regX;
		offset.oy = game.world.regY;
		offset.x = e.stageX;
		offset.y = e.stageY;
	});
	background.on("pressmove",function(e) {
		game.world.regX = game.hold.regX = offset.ox-e.stageX+offset.x;
		game.world.regY = game.hold.regY = offset.oy-e.stageY+offset.y;
	});

	var tray = this.tray = new createjs.Container();
	stage.addChild(tray);
	var tray_background = this.tray_background = new createjs.Shape();
	tray.addChild(tray_background);

	var hold = this.hold = new createjs.Container();
	stage.addChild(hold);

	var doneButton = this.doneButton = new createjs.Container();
	var text = new createjs.Text("Done","40px Arial","black");
	var metric = text.getMetrics();
	var rect = new createjs.Shape();
	rect.graphics
		.beginFill('lightgreen')
		.drawRoundRect(-5,-5,metric.width+10,metric.height+10,5);
	doneButton.addChild(rect);
	doneButton.addChild(text);
	stage.addChild(doneButton);
	doneButton.visible = false;

	doneButton.on('click',function() {
		game.end_turn();
	});

	this.draw();
	this.replenish_tray();

	document.onkeypress = function(e) {
		var key = e.which;
		switch(key) {
			case 13:
				game.end_turn();
				break;
		}
	}
}
var vowel_scale = 1.5;
Game.prototype = {
	piece_frequencies: {
		E: 12.02*vowel_scale,
		T: 9.10,
		A: 8.12*vowel_scale,
		O: 7.68*vowel_scale,
		I: 7.31*vowel_scale,
		N: 6.95,
		S: 6.28,
		R: 6.02,
		H: 5.92,
		D: 4.32,
		L: 3.98,
		U: 2.88*vowel_scale,
		C: 2.71,
		M: 2.61,
		F: 2.30,
		Y: 2.11,
		W: 2.09,
		G: 2.03,
		P: 1.82,
		B: 1.49,
		V: 1.11,
		K: 0.69,
		X: 0.17,
		Q: 0.11,
		J: 0.10,
		Z: 0.07
	},

	draw: function() {
		var o_width = this.g_width;
		var o_height = this.g_height;

		this.g_width = this.stage.canvas.width;
		this.g_height = this.stage.canvas.height;

		this.world.regX += (o_width-this.g_width)/2;
		this.world.regY += (o_height-this.g_height)/2;

		this.hold.regX = this.world.regX;
		this.hold.regY = this.world.regY;

		this.background.graphics
			.clear()
			.beginFill('#efe')
			.rect(0,0,this.g_width,this.g_height)
		;

		this.tray_y = this.g_height-100;

		this.tray_background.graphics
			.clear()
			.beginFill('#eee')
			.rect(0,this.tray_y,this.g_width,this.g_height)
		;
		this.slot_width = Math.min(this.g_width/7,3*Piece.radius);

		this.position_tray_items();

		this.doneButton.set({x:this.g_width/2,y:15})

		this.stage.update();
	},

	add_piece_to_tray: function(piece,to_end) {
		var i = this.tray_pieces.indexOf(piece);
		if(i>=0) {
			this.tray_pieces.splice(i,1);
		}

		this.placed_pieces.delete(piece);
		if(to_end) {
			this.tray_pieces.push(piece);
		} else {
			var p = piece.container.localToGlobal(0,0);
			i = Math.floor(p.x/this.slot_width);
			this.tray_pieces.splice(i,0,piece);
		}

		piece.container.parent.removeChild(piece.container);
		this.tray.addChild(piece.container);

		this.position_tray_items();
	},

	remove_from_tray: function(piece) {
		var i = this.tray_pieces.indexOf(piece);
		if(i==-1) {
			return;
		}
		this.tray_pieces.splice(i,1);
		this.position_tray_items();
		this.placed_pieces.add(piece);
	},

	position_tray_items: function() {
		var y = (this.tray_y+this.g_height)/2;
		this.tray_pieces.map(function(piece,i) {
			var x = (i+0.5)*this.slot_width;
			piece.container.set({x:x,y:y,rotation:0});
		},this);
		this.stage.update();
	},

	replenish_tray: function() {
		while(this.tray_pieces.length<7) {
			var p = new Piece(this,choice(this.piece_frequencies));
			this.add_piece_to_tray(p,true);
		};
	},

	can_end_turn: function() {
		this.doneButton.visible = false;

		try {
			var unlinked = 0;
			var unfixed = 0;
			var first_piece;
			for(var piece of this.placed_pieces) {
				if(!piece.fixed) {
					unfixed += 1;
					if(piece.linked_piece && piece.linked_pieces.size==0) {
						first_piece = piece;
					}
				}
				if(!piece.linked_piece) {
					unlinked += 1;
				}
			}
			if(unlinked>1) {
				throw(new Error("There's a loose piece on the board"));
			}
			if(unfixed==0) {
				throw(new Error("No new pieces on the board"));
			}

			var path = [];
			var piece = first_piece;
			while(piece && !piece.fixed) {
				path.push(piece);
				piece = piece.linked_piece;
			}
			if(!piece) {
				piece = path[path.length-1];
				path.pop();
			}
			function check_piece(piece,path) {
				var last = path[path.length-1];
				path = path.slice();
				path.push(piece);
				for(var p2 of piece.linked_pieces) {
					if(p2!=last) {
						var path2 = check_piece(p2,path,piece);
						if(!path2[path2.length-1].fixed) {
							return path2;
						}
					}
				}
				if(piece.linked_piece && piece.linked_piece!=last) {
					var p2 = piece.linked_piece;
					var path2 = check_piece(p2,path,piece);
					if(!path2[path2.length-1].fixed) {
						return path2;
					}
				}
				return path;
			}
			path = check_piece(piece,path);

			var word = path.join('');
			var word2 = path.reverse().join('');

			if(word.length<3) {
				throw(new Error("Word is too short"));
			}

			var word_unfixed = 0;
			path.map(function(p){
				if(!p.fixed) {
					word_unfixed += 1;
				}
			});
			if(word_unfixed!=unfixed) {
				throw(new Error("Not all the placed letters belong to the same word"));
			}
		} catch(e) {
			return false;
		}

		this.doneButton.visible = true;

		if(this.wordlist.has(word)) {
			return word;
		} else if(this.wordlist.has(word2)) {
			return word2;
		} else {
			return false;
		}
	},
	end_turn: function() {
		var word = this.can_end_turn();
		if(!word) {
			return;
		}
		console.log(word);

		for(var piece of this.placed_pieces) {
			piece.fix();
		}

		this.replenish_tray();

		this.doneButton.visible = false;
		this.stage.update();
	}
}

function Piece(game,letter) {
	this.game = game;
	var piece = this;
	this.letter = letter;

	this.make_shape();

	this.linked_pieces = new Set();

	this.fixed = false;

	game.placed_pieces.add(this);
}

Piece.radius = 40;
Piece.alpha = rad(30);
Piece.beta = Math.asin(Piece.radius*Math.sin(Piece.alpha)/Piece.radius);
Piece.snap_distance = Piece.radius*(Math.cos(Piece.alpha)+Math.cos(Piece.beta));

Piece.prototype = {
	toString: function() {
		return this.letter;
	},

	make_shape: function() {
		var piece = this;
		var game = this.game;
		var container = this.container = new createjs.Container();
		container.set({x:0,y:0});
		game.world.addChild(container);

		var shadow_shape = this.shadow = new createjs.Shape();
		shadow_shape.shadow = new createjs.Shadow("rgba(0,0,0,0.5)",5,5,10);
		var circle = this.circle = new createjs.Shape();
		container.addChild(circle);

		this.draw();

		var text = new createjs.Text(this.letter,"40px Arial","black");
		var metric = text.getMetrics();
		text.set({
			x: -metric.width/2,
			y: -metric.height/2
		});
		container.addChild(text);

		container.on("mousedown", function(evt) {
			if(piece.fixed) {
				return;
			}

			piece.pick_up();
		});
		container.on("pressmove", function(evt) {
			if(piece.fixed) {
				return;
			}
			var x = evt.stageX+container.parent.regX;
			var y = evt.stageY+container.parent.regY;
			piece.set_position(x,y);
		});
		container.on("pressup",function(evt) {
			piece.drop();
		});
	},

	pick_up: function() {
		this.container.addChildAt(this.shadow,0);
		this.overlap = false;
		this.draw();

		var p = this.container.localToLocal(0,0,this.game.world);
		this.container.parent.removeChild(this.container);
		this.game.hold.addChild(this.container);
		this.game.remove_from_tray(this);
	},

	drop: function() {
		var game = this.game;
		this.container.removeChild(this.shadow);

		if(this.fixed) {
			return;
		}
		var p = this.container.localToGlobal(0,0);
		game.hold.removeChild(this.container);
		game.world.addChild(this.container);
		if(p.y>game.tray_y) {
			game.add_piece_to_tray(this);
		}

		this.overlap = false;
		for(var p2 of game.placed_pieces) {
			if(!(p2==this || p2==this.neighbour)) {
				var d = distance(this.container,p2.container);
				if(d<2*Piece.radius) {
					this.overlap = true;
					break;
				}
			}
		}

		this.draw();

		game.can_end_turn();
		game.stage.update();
	},

	draw: function() {
		var radius = Piece.radius;
		var alpha = Piece.alpha;
		var beta = Piece.beta;
		var sub = (radius*Math.cos(alpha)+radius*Math.cos(beta));

		this.shadow.graphics
			.clear()
			.beginFill("white")
			.arc(0,0,radius,rad(-90)+alpha,rad(270)-alpha)
			.arc(0,-sub,radius,rad(90)+beta,rad(90)-beta,true)
		;
		var color = this.fixed ? '#eee' : this.overlap ? 'red' : 'white';
		this.circle.graphics
			.clear()
			.beginFill(color)
			.beginStroke("black")
			.arc(0,0,radius,rad(-90)+alpha,rad(270)-alpha)
			.arc(0,-sub,radius,rad(90)+beta,rad(90)-beta,true)
		;
	},

	set_position: function(x,y) {
		if(this.fixed) {
			return;
		}

		this.container.set({
			x: x,
			y: y
		});

		this.check_neighbours();
	},
	
	check_neighbours: function() {
		this.unlink();

		var neighbour = this.closestNeighbour();
		if(neighbour && neighbour.distance<3*Piece.radius) {
			this.neighbour = neighbour.piece;
			var dx = (this.container.x - neighbour.piece.container.x)/neighbour.distance;
			var dy = (this.container.y - neighbour.piece.container.y)/neighbour.distance;
			var rotation = deg(Math.atan2(dy,dx))-90;
			this.container.set({
				rotation:rotation
			});
			var fixed_rotation = fix_angle(rad(rotation-neighbour.piece.container.rotation));
			var min_angle = rad(-90)-Piece.alpha;
			var max_angle = rad(90)+Piece.alpha;
			if(fixed_rotation<min_angle && fixed_rotation>min_angle-PI/12) {
				fixed_rotation = min_angle;
			}
			if(fixed_rotation>max_angle && fixed_rotation<max_angle+PI/12) {
				fixed_rotation = max_angle;
			}
			if(neighbour.distance<=Piece.snap_distance && (fixed_rotation>=min_angle && fixed_rotation<=max_angle)) {
				rotation = fixed_rotation+rad(neighbour.piece.container.rotation);
				var x = neighbour.piece.container.x + Math.cos(PI/2+rotation)*Piece.snap_distance;
				var y = neighbour.piece.container.y + Math.sin(PI/2+rotation)*Piece.snap_distance;
				this.link(neighbour.piece);
				this.container.set({
					x: x,
					y: y,
					rotation: deg(rotation)
				});
			}
		} else {
			this.container.set({
				rotation: 0
			});
		}
	},
	closestNeighbour: function() {
		var piece = this;
		var closest = null;
		var minDist = 0;
		for(var p2 of game.placed_pieces) {
			if(p2!==piece) {
				var dx = piece.container.x - p2.container.x;
				var dy = piece.container.y - p2.container.y;
				var d = dx*dx+dy*dy;
				if(!closest || d<minDist) {
					minDist = d;
					closest = p2;
				}
			}
		};
		if(closest) {
			return {piece: closest, distance: Math.sqrt(minDist)};
		}
	},
	
	link: function(piece) {
		this.linked_piece = piece;
		piece.linked_pieces.add(this);
	},
	unlink: function() {
		this.linked_pieces.clear();
		if(this.linked_piece) {
			this.linked_piece.linked_pieces.delete(this);
			this.linked_piece = null;
		}
	},

	fix: function() {
		this.fixed = true;
		this.draw();
	}
}

function resizeGame() {
	var gameArea = document.getElementById('game-area');
	var widthToHeight = 16/9;
	var newWidth = window.innerWidth;
	var newHeight = window.innerHeight-8;
	var newWidthToHeight = newWidth / newHeight;

	if (newWidthToHeight > widthToHeight) {
		newWidth = newHeight * widthToHeight;
	} else {
		newHeight = newWidth / widthToHeight;
	}
	gameArea.style.height = newHeight + 'px';
	gameArea.style.width = newWidth + 'px';

	gameArea.style.marginTop = (-newHeight / 2) + 'px';
	gameArea.style.marginLeft = (-newWidth / 2) + 'px';

	var gameCanvas = document.getElementById('canvas');
	gameCanvas.width = newWidth;
	gameCanvas.height = newHeight;

	if(game) {
		game.draw();
	}
}

$(document).ready(function() {
	words = new Set(words.split('\n').map(function(word){return word.toUpperCase()}));
	var stage = new createjs.Stage("canvas");
	createjs.Touch.enable(stage);

	stage.on("pressmove",function(evt) {
		stage.update();
	});

	game = new Game(stage,words);

	window.addEventListener('resize', resizeGame, false);
	window.addEventListener('orientationchange', resizeGame, false);

	resizeGame(game);
});
