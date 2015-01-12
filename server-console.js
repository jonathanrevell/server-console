// server-console.js
// Created by Jonathan Revell H.
// @jonathanRevell

//ServerConsoleLog priority
//(Low Priority) 1 --- 3 (Normal) --- 5 (Critical Priority)
//Any error with priority of 4 or greater is considered "critical"
//Any error with priority 1 will be considered a "verbose error".

ServerConsoleLog = function( message, options ) {
	this.message = message;

	if( options ) {
		this.priority 	= options.priority || 3;
		this.type 		= options.type || "normal";
		this.args 		= options.args || null;
		this.header 	= options.header || null;
	}

	this.getMessage = function( showHeader, showType  ) {
		var msg = "";

		if( showHeader && this.header ) {
			msg = msg + " (" + this.header + ") ";
		}
		if( showType && this.type ) {
			msg = msg + " <" + this.type + "> ";
		}


		//Output object properties instead of [object Object]
		if(typeof this.message === 'object') {
			var keys = Object.keys( this.message );

			for(var idx in keys) {
				var property = keys[idx],
					val = this.message[property];

				if(typeof val === 'function') {
					val = 'function ()'
				}
				else if(typeof val === 'object') {
					val = '{ ... }'
				}

				msg = msg + property + ": " + val + ", ";
			}
		} else {
			msg = msg + this.message;
		}

		return msg;
	}

	this.getPriority = function() {
		return (this.priority || 3);
	}

	this.getType = function() {
		return (this.type || "normal");
	}
}


// A smarter console that gives the developer more control
// Over display, nesting, and so on
ServerConsole = {
	lastMessage: null,
	queue: [],
	section: [],
	sectionDepth: -1,	//Current section depth
	PRIORITY_LEVELS: {
		 "low": 1 ,
		 "high": 4 ,
		 "critical": 5 
	},
	MODES: [
		"verbose",	// Every message is displayed
		"normal",	// All except low priority and verbose messages displayed
		"sparse",	// Only high priority messages and non-verbose errors displayed
		"concise",	// Same as sparse, except section headers are not shown
		"error", 	// Only errors, and all errors displayed
		"progress",	// Display progress messages and non-verbose errors only
		"silent"	// No messages displayed at all
	],
	mode: "normal",
	showHeaders: true,
	showTypes: false,
	showSections: "onChange",			//ShowSections options: onChange, firstLog, logOnly, always, never
	firstSectionLogOccurred: false,		//The first log generated at the start of a section
	useIndentedSections: true,			//Add an indent for each section level


	// Default log, a generic message
	log: function( message, options ) {
		this._log( message, options )
	},

	// Logs an extra detail with low priority,
	// will not be shown unless verbose is on
	logVerbose: function( message, options ) {
		options = _.extend( {
			priority: 1,
			type: "verbose"
		}, options);
		this._log( message, options );
	},

	// Logs an important message
	logImportant: function( message, options ) {
		options = _.extend( {
			priority: 4,
		}, options);
		this._log( message, options );
	},

	logCritical: function( message, options ) {
		options = _.extend( {
			priority: 5,
		}, options);
		this._log( message, options );
	},

	// Logs an error message
	logError: function( message, options ) {
		options = _.extend( {
			priority: 4,
			type: "error"
		}, options);
		this._log( message, options );
	},

	// Logs a low priority error
	logVerboseError: function( message, options ) {
		options = _.extend( {
			priority: 1,
			type: "error"
		}, options);
		this._log( message, options );		
	},

	// Logs a progress message.
	logProgress: function( message, options ) {
		options = _.extend( {
			type: "progress"
		}, options);
		this._log( message, options );
	},

	// Complete log function, which the other functions act as shortcuts for
	_log: function( message, options ) {
		var newLog = new ServerConsoleLog( message, options );
		this.processLogItem( newLog );
	},

	processLogItem: function( logItem ) {
		
		if( this.shouldShowItem( logItem ) ) {
			var msg = logItem.getMessage( this.showHeaders, this.showTypes );

			if( ( this.showSections == "always" ) || ( this.showSections == "logOnly" ) || (this.showSections == "firstLog" && !this.firstSectionLogOccurred )){
				var section = this.section[ this.sectionDepth ];

				if( section ) {
					msg = "[" + section + "] " + msg;
				}
				this.firstSectionLogOccurred = true;
			}
			if( this.useIndentedSections ) {
				msg = this.getSectionIndentation() + msg;
			}

			//Output the message to the console
			console.log(msg);
			this.lastMessage = msg;
		}

		//TODO: In the future logs can also be written to a file
		//Logging modes: matchConsole, verbose, sparse, silent
	},

	getSectionIndentation: function( section ) {
		section = section || this.sectionDepth;
		section = section >= 0 ? section : 0;	//Don't allow negative indent

		var indent = "",
			counter = 0;

		while( counter < section ) {
			indent = indent + "\t";
			counter++;
		}

		return indent;
	},

	// Returns whether the given log item/message should be shown
	// based on its priority and so on
	shouldShowItem: function( logItem ) {
		var result 		= false,
			type 		= logItem.getType(),
			priority 	= logItem.getPriority();

		if( this.mode == "verbose" ) {
			// Every message is displayed
			result = true;

		} else if( this.mode == "normal" ) {
			// All except low priority (1) and verbose messages displayed
			result = ((type != "verbose") && (priority > this.PRIORITY_LEVELS["low"]));

		} else if( this.mode == "sparse" || this.mode == "concise" ) {
			// Only high priority messages and non-verbose errors displayed
			result = ((type != "verbose") && (priority >= this.PRIORITY_LEVELS["high"]));

		} else if( this.mode == "error" ) {
			// Only errors, and all errors displayed
			result = (type == "error");

		} else if( this.mode == "progress" ) {
			// Display progress messages and non-verbose errors only
			result = ((type == "progress") || ((type == "error") && (priority > this.PRIORITY_LEVELS["low"])));

		} else if( this.mode == "silent" ) {
			result = false;
		}

		return result;
	},

	// Starts a new section, nesting automatically
	startSection: function( sectionName, options ) {
		this.sectionDepth++;
		this.section[ this.sectionDepth ] = sectionName;
		this.firstSectionLogOccurred = false;

		if(this.mode != "concise" && ( this.showSections == "onChange" || this.showSections == "always") ) {
			console.log( "\n\n[" + sectionName + "]\n" );
		}
	},

	// Use the same "sectionName" as used to start it
	// If no name is provided it just closes the most recently
	// opened (deepest) section.
	endSection: function( sectionName ) {
		var newDepth = this.sectionDepth - 1,
			index;

		if( sectionName ) {
			index = this.section.indexOf( sectionName );
			if( index > -1 ) { newDepth = index - 1 } 
		}
		
		this.sectionDepth = newDepth;
	},

	setMode: function( mode ) {
		this.mode = mode;
	}
}

module.exports = ServerConsole;
