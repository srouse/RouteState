
/*

#TODO Empty Property Classes:
RouteState.showEmptyStates("page","tab",...);
It will render class tags (only, no hashing) when
no value (or "") exists in the state
<body class="s_page_ s_tab_ ...">
This will make it infinitely easier to have cleaner default states for 
CSS to hook into.

*/


var RouteState = function(){};

RouteState.route;
RouteState.prev_route;

RouteState.inject_body_class = true;

RouteState.ROUTE_CHANGE_EVENT = "ROUTE_CHANGE_EVENT";

RouteState.listenToHash = function ( funk ) 
{
	var me = this;
	$(window).on('hashchange',function() {
		me.prev_route = me.route;
    	me.route = me.routeFromPath( document.location.hash );
    	me.route.toBodyClass();
    	me.checkDiffListeners();
    	me.checkPropValueListeners();

		if ( funk ) {
			funk( me.route );
	    }
    	
	});
	
	//first one to deal with...
	this.prev_route = this.factory();
	this.route = this.routeFromPath( document.location.hash );
	this.route.toBodyClass();
	this.checkDiffListeners();
	this.checkPropValueListeners();

	if ( funk ) {
		funk( this.route );
	}

};
 
RouteState.unlistenHash = function () 
{
	$(window).off('hashchange');
};


//Only show some state names relative to the state of a dependancy
RouteState.dependencies = {};
RouteState.saved_dependencies = {};
RouteState.addDisplayDependency = function ( names , dependancy ) 
{
	var name;
	for ( var i=0; i<names.length; i++ ) {
		name = names[i];
		if ( !this.dependencies[name] ) {
			this.dependencies[name] = [];
		}
		
		this.dependencies[name].push( dependancy );
	}
}
RouteState.dependencyFulfilled = function ( route , name ) 
{
	if ( !this.dependencies[name] || !route ) {
		return true;
	}else{
		var dependancy;
		for ( var i=0; i<this.dependencies[name].length; i++ ) {
			dependancy = this.dependencies[name][i];
			for ( var dep_name in dependancy ) {
				if ( route[dep_name] !== dependancy[dep_name] ) {
					this.saved_dependencies[ name ] = route[name];
					return false;
					break;
				}
			}
		}
		return true;
	}
}


//Diff listener
RouteState.diffListeners = {};
RouteState.addDiffListener = function ( prop , callback ) 
{
	if ( !this.diffListeners[ prop ] ) {
		this.diffListeners[ prop ] = [];
	}
	this.diffListeners[ prop ].push( callback );
}
RouteState.checkDiffListeners = function () 
{
	if ( this.route ) {
		var callbacks,callback,trigger_callbacks;
		
		
		for ( var prop in this.diffListeners ) {
			callbacks = this.diffListeners[prop];
			trigger_callbacks = false;
			
			if ( this.prev_route ) {
				if ( this.route[prop] != this.prev_route[prop] ) {
					trigger_callbacks = true;
				}
			}else{
				trigger_callbacks = true;
			}

			if ( trigger_callbacks ) {
				for ( var c=0; c<callbacks.length; c++ ) {
					callback = callbacks[c];
					callback( this.route , this.prev_route );
				}
			}
		}
	}
}


RouteState.propValueListeners = {};
RouteState.addPropValueListener = function ( prop , value , callback , exitcallback ) 
{
	if ( !this.propValueListeners[ prop ] ) {
		this.propValueListeners[ prop ] = [];
	}
	this.propValueListeners[ prop ].push( {value:value,callback:callback,exitcallback:exitcallback} );
}
RouteState.checkPropValueListeners = function () 
{
	if ( this.route ) {
		
		var callbackObjs,callbackObj;
		for ( var prop in this.propValueListeners ) {
			callbackObjs = this.propValueListeners[prop];
			if ( this.prev_route ) {
				for ( var c=0; c<callbackObjs.length; c++ ) {
					callbackObj = callbackObjs[c];
					
					//check for exit callback first...
					if ( 
						callbackObj.exitcallback &&
						this.prev_route[prop] == callbackObj.value &&
						this.route[prop] != callbackObj.value	
					) {
						callbackObj.exitcallback( this.route , this.prev_route );
					}
					
					
					if ( 
						this.route[prop] == callbackObj.value &&
						this.prev_route[prop] != callbackObj.value	
					) {
						callbackObj.callback( this.route , this.prev_route );
					}
				}
			}else{
				//call them all there is no prev route....
				
				for ( var c=0; c<callbackObjs.length; c++ ) {
					callbackObj = callbackObjs[c];
					callbackObj.callback( this.route , this.prev_route );
				}
			}
		}
	}
}





RouteState.factory = function ( state ) 
{	
	var routeStateRoute = new RouteStateRoute();
	
	for ( var i in state ) {
		if ( !RouteState.isFunction( i ) ) {
			if ( RouteState.isArray( state[i] ) ) {
				routeStateRoute[i] = [].concat( state[i] );
			}else{
				routeStateRoute[i] = state[i];
			}
		}
	}
	
	return routeStateRoute;
}; 

RouteState.routeFromPath = function ( path ) 
{
	var routeStateRoute = this.factory( this.saved_dependencies );

	//get rid of shebang
	path = path.replace(/#!\//g,"");
	path = path.replace(")","");
	
	var pathArr = path.split("/(");
	
	if ( pathArr.length < 2 ) {
		return routeStateRoute;
	}
	
	var names = pathArr[1];
	var vals = pathArr[0];
	
	
	var valsArr = vals.split("/");
	var namesArr = names.split(",");
	
	var state = {};
	var pair,name,val;
	for ( var a=0; a<namesArr.length; a++ ) {
		name = namesArr[a];
		val = valsArr[a];
		if ( val && val.length > 0 && name && name.length > 0) {
			if ( val.indexOf( "," ) != -1 ) {
				routeStateRoute[name] = val.split(",");
			}else{
				routeStateRoute[name] = val;
			}
		}
	}

	return routeStateRoute;
};

RouteState.isFunction = function( functionToCheck ) {
	var getType = {};
	return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
};
RouteState.isArray = function( functionToCheck ) {
	var getType = {};
	return functionToCheck && getType.toString.call(functionToCheck) === '[object Array]';
};



RouteState.toPath = function ( pathname , overrides , replace_arrays ) {
	var route = this.route.clone( overrides , replace_arrays );
	var routeStr = route.toString();
	document.location = pathname + document.location.search + routeStr;
};

RouteState.merge = function ( overrides , replace_arrays )
{
	if ( this.route ) {
		this.route.clone( overrides , replace_arrays ).toHash();
	}
};

RouteState.toPathAndReplace = function ( pathname , state ) {
	var route = RouteState.factory( state );
	var routeStr = route.toString();
	document.location = pathname + document.location.search + routeStr;
};

RouteState.replace = function ( state ) 
{
	RouteState.factory( state ).toHash();
};

RouteState.toggle = function ( state , other_state , replace_arrays ) 
{
	for ( var name in state ) {
		if ( this.isArray( state[name] ) ) {
			if ( !this.route[name] ) {
				this.route[name] = [];
			}
			if ( !RouteState.isArray( this.route[name] ) ) {
				this.route[name] = [].concat( this.route[name] );
			}
			
			var sub_name;
			for ( var i=0; i<state[name].length; i++ ) {
				sub_name = state[name][i];

				if ( this.route[name].indexOf( sub_name ) == -1 ) {
					this.merge( state , replace_arrays );
					return;
					break;
				}
			}
		}else{
			if ( this.route[name] != state[name] ) {
				this.merge( state , replace_arrays );
				return;
				break;
			}
		}
	}
	
	this.merge( other_state , replace_arrays );
};

RouteState.toggleIfThen = function ( cond_state , if_state , then_state , replace_arrays ) 
{
	for ( var name in cond_state ) {
		if ( this.isArray( cond_state[name] ) ) {
			if ( !this.route[name] ) {
				this.route[name] = [];
			}
			if ( !RouteState.isArray( this.route[name] ) ) {
				this.route[name] = [].concat( this.route[name] );
			}
			
			var sub_name;
			for ( var i=0; i<cond_state[name].length; i++ ) {
				sub_name = cond_state[name][i];

				if ( this.route[name].indexOf( sub_name ) == -1 ) {
					this.merge( if_state , replace_arrays );
					return;
					break;
				}
			}
		}else{
			if ( this.route[name] != cond_state[name] ) {
				this.merge( if_state , replace_arrays );
				return;
				break;
			}
		}
	}
	
	this.merge( then_state , replace_arrays );
};


RouteState.debug = function () 
{
	$(".routestate_debug").remove();
	var html = ["width" + $(window).width() + "|height" + $(window).height()];
	for ( var i in this.route ) {
		if ( !RouteState.isFunction( this.route[i] ) ) {
			if ( RouteState.isArray( this.route[i] ) ) {
				html.push( i + " = " + this.route[i].join(",<br/>&nbsp;&nbsp;&nbsp;&nbsp;") );
			}else{
				html.push( i + " = " + this.route[i] );
			}
		}
	}
	
	$("body").append("<div onclick='$(\".routestate_debug\").remove();' class='routestate_debug' style='padding: 10px; border: 1px solid grey; width:300px; background-color: #fff;position: fixed; top: 10px; left: 10px; z-index: 2000000;'>" +html.join("<br/>")+ "</div>");
};

//Route State instance....
//RouteStateRoute
var RouteStateRoute = function(){};

RouteStateRoute.prototype.toString = function () {
	var routeArr = ["#!"];
	
	var nameArr = [];
	var valArr = [];
	for ( var name in this ) {
		if ( !RouteState.isFunction( this[name] ) && this[name] && String( this[name] ).length > 0 ) {
			if ( RouteState.dependencyFulfilled( this , name ) ) {
				if ( RouteState.isArray( this[name] ) ) {
					routeArr.push( name + ":" + this[name].join(",") );
					nameArr.push( name );
					valArr.push( this[name].join(",") );
				}else{
					routeArr.push( name + ":" + this[name] );
					nameArr.push( name );
					valArr.push( this[name] );
				}
			}
		}
	}
	
	//return routeArr.join("/");
	if ( valArr.length > 0 ) {
		return "#!/" + valArr.join("/") + "/(" + nameArr.join(",") + ")";
	}else{
		return "";
	}
};
RouteStateRoute.prototype.toHash = function () {
	this.toBodyClass();//make it happen quicker...will happen again at hash change...
	var routeStr = this.toString();
	//empty string will not get rid of "#", but oh well...
	document.location.hash = routeStr;
};

RouteStateRoute.prototype.toBodyClass = function () {
	if ( RouteState.inject_body_class ) {

		var body_class = $('body').attr('class');
		if ( body_class ) {
			var classList = body_class.split(/\s+/);
			$.each( classList, function(index, item){
			    if ( item.indexOf( 's_' ) == 0  ) {
			       $('body').removeClass( item );
			    }
			});
		}
		
		var body_classes = [];
		
		//put pathname in there...
		//pathname always has a preceeding slash
		body_classes.push( "s_pathname" + document.location.pathname.replace( /\//g , "_" ).replace( /\./g , "_" ) );
		
		for ( var name in this ) {
			if ( !RouteState.isFunction( this[name] ) && name.length > 0 && this[name] && String( this[name] ).length > 0 ) {
				
				if ( RouteState.dependencyFulfilled( this , name ) ) {
					if ( RouteState.isArray( this[name] ) ) {
						var element;
						for ( var e=0; e<this[name].length; e++ ) {
							element = this[name][e];
							body_classes.push( "s_" + name + "_" + element );
						}
					}else{
						body_classes.push( "s_" + name + "_" + this[name] );
					}
					
					body_classes.push( "s_" + name );//just a name, boolean lookup thing
				}
			}
		}
		
		
		if ( body_classes.length == 0 ) {
			body_classes.push("s_empty");
		}
		$("body").addClass( body_classes.join(" ") );
	}
};
RouteStateRoute.prototype.clone = function ( overrides , replace_arrays  ) {
	var routeState = RouteState.factory( this );

	if ( !replace_arrays ) {
		replace_arrays = false;
	}
	
	if ( overrides ) {
		for ( var i in overrides ) {
			if ( !RouteState.isFunction( overrides[i] ) ) {
				
				if ( RouteState.isArray( overrides[i] ) ) {
					if ( replace_arrays ) {
						routeState[i] = [].concat( overrides[i] );
					}else{
						
						if ( !routeState[i] ) {
							routeState[i] = [];
						}
						if ( !RouteState.isArray( routeState[i] ) ) {
							routeState[i] = [].concat( routeState[i] );
						}
						
						var override;
						for ( var p=0; p<overrides[i].length; p++ ) {
							override = overrides[i][p];
							if ( override.indexOf("-") == 0 ) {
								override = override.replace("-","");
								var index = routeState[i].indexOf(override);
								if (index > -1) {
									routeState[i].splice(index, 1);
								}
							}else{
								if ( routeState[i].indexOf( override ) == -1 ) {
									routeState[i].push( override );
								}
							}
						}
					}
				}else{
					routeState[i] = overrides[i];
				}
			}
		}
	}
	return routeState;
};



