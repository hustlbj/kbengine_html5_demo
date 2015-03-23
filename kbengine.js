var KBEngine = KBEngine || {};

/*-----------------------------------------------------------------------------------------
					    	JavaScript Inheritance
-----------------------------------------------------------------------------------------*/
/* Simple JavaScript Inheritance
 * By John Resig http://ejohn.org/
 * MIT Licensed.
 */
KBEngine.Class = function(){};
KBEngine.Class.extend = function (prop) {
    var _super = this.prototype;

    // Instantiate a base class (but only create the instance,
    // don't run the init constructor)
    initializing = true;
    var prototype = Object.create(_super);
    initializing = false;
    fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;

    // Copy the properties over onto the new prototype
    for (var name in prop) {
        // Check if we're overwriting an existing function
        prototype[name] = typeof prop[name] == "function" &&
            typeof _super[name] == "function" && fnTest.test(prop[name]) ?
            (function (name, fn) {
                return function () {
                    var tmp = this._super;

                    // Add a new ._super() method that is the same method
                    // but on the super-class
                    this._super = _super[name];

                    // The method only need to be bound temporarily, so we
                    // remove it when we're done executing
                    var ret = fn.apply(this, arguments);
                    this._super = tmp;

                    return ret;
                };
            })(name, prop[name]) :
            prop[name];
    }

    // The dummy class constructor
    function Class() {
        // All construction is actually done in the init method
        if (!initializing) {
            if (!this.ctor) {
                if (this.__nativeObj)
                    console.info("No ctor function found!");
            }
            else {
                this.ctor.apply(this, arguments);
            }
        }
    }

    // Populate our constructed prototype object
    Class.prototype = prototype;

    // Enforce the constructor to be what we expect
    Class.prototype.constructor = Class;

    // And make this class extendable
    Class.extend = arguments.callee;

    return Class;
};

/*-----------------------------------------------------------------------------------------
												global
-----------------------------------------------------------------------------------------*/
KBEngine.PACKET_MAX_SIZE		= 1500;
KBEngine.PACKET_MAX_SIZE_TCP	= 1460;
KBEngine.PACKET_MAX_SIZE_UDP	= 1472;

KBEngine.MESSAGE_ID_LENGTH		= 2;
KBEngine.MESSAGE_LENGTH_LENGTH	= 2;

KBEngine.CLIENT_NO_FLOAT		= 0;
KBEngine.KBE_FLT_MAX			= 3.402823466e+38;

/*-----------------------------------------------------------------------------------------
												number64bits
-----------------------------------------------------------------------------------------*/
KBEngine.INT64 = function(hi, lo)
{
	this.hi = hi;
	this.lo = lo;
}

KBEngine.UINT64 = function(hi, lo)
{
	this.hi = hi;
	this.lo = lo;
}

/*-----------------------------------------------------------------------------------------
												memorystream
-----------------------------------------------------------------------------------------*/
KBEngine.MemoryStream = function(size_or_buffer)
{
	if(size_or_buffer instanceof ArrayBuffer)
	{
		this.buffer = size_or_buffer;
	}
	else
	{
		this.buffer = new ArrayBuffer(size_or_buffer);
	}

	this.rpos = 0;
	this.wpos = 0;
	
	//---------------------------------------------------------------------------------
	this.readInt8 = function()
	{
		var buf = new Int8Array(this.buffer, this.rpos, 1);
		this.rpos += 1;
		return buf[0];
	}

	this.readInt16 = function()
	{
		var v = this.readUint16();
		if(v >= 32768)
			v -= 65536;
		return v;
	}
		
	this.readInt32 = function()
	{
		var v = this.readUint32();
		if(v >= 2147483648)
			v -= 4294967296;
		return v;
	}

	this.readInt64 = function()
	{
		return new KBEngine.INT64(this.readInt32(), this.readInt32());
	}
	
	this.readUint8 = function()
	{
		var buf = new Uint8Array(this.buffer, this.rpos, 1);
		this.rpos += 1;
		return buf[0];
	}

	this.readUint16 = function()
	{
		var buf = new Uint8Array(this.buffer, this.rpos);
		this.rpos += 2;
		return ((buf[1] & 0xff) << 8) + (buf[0] & 0xff);
	}
		
	this.readUint32 = function()
	{
		var buf = new Uint8Array(this.buffer, this.rpos);
		this.rpos += 4;
		return (buf[3] << 24) + (buf[2] << 16) + (buf[1] << 8) + buf[0];
	}

	this.readUint64 = function()
	{
		return new KBEngine.UINT64(this.readUint32(), this.readUint32());
	}
	
	this.readFloat = function()
	{
		try
		{
			var buf = new Float32Array(this.buffer, this.rpos, 1);
		}
		catch(e)
		{
			var buf = new Float32Array(this.buffer.slice(this.rpos, this.rpos + 4));
		}
		
		this.rpos += 4;
		return buf[0];
	}

	this.readDouble = function()
	{
		try
		{
			var buf = new Float64Array(this.buffer, this.rpos, 1);
		}
		catch(e)
		{
			var buf = new Float64Array(this.buffer.slice(this.rpos, this.rpos + 8), 0, 1);
		}
		
		this.rpos += 8;
		return buf[0];
	}
	
	this.readString = function()
	{
		var buf = new Uint8Array(this.buffer, this.rpos);
		var i = 0;
		var s = "";
		
		while(true)
		{
			if(buf[i] != 0)
			{
				s += String.fromCharCode(buf[i]);
			}
			else
			{
				i++;
				break;
			}
			
			i++;
			
			if(this.rpos + i >= this.buffer.byteLength)
				throw(new Error("KBEngine.MemoryStream::readString: rpos(" + (this.rpos + i) + ")>=" + 
					this.buffer.byteLength + " overflow!"));
		}
		
		this.rpos += i;
		return s;
	}

	this.readBlob = function()
	{
		size = this.readUint32();
		var buf = new Uint8Array(this.buffer, this.rpos, size);
		this.rpos += size;
		return buf;
	}

	this.readStream = function()
	{
		var buf = new Uint8Array(this.buffer, this.rpos, this.buffer.byteLength - this.rpos);
		this.rpos = this.buffer.byteLength;
		return new KBEngine.MemoryStream(buf);
	}
	
	this.readPackXZ = function()
	{
		var v1 = this.readUint8();
		var v2 = this.readUint8();
		var v3 = this.readUint8();
		
		var data = new Array(2);
		data[0] = 0.0;
		data[1] = 0.0;
		return data;
	}

	this.readPackY = function()
	{
		var v = this.readUint16();
		return v;
	}
	
	//---------------------------------------------------------------------------------
	this.writeInt8 = function(v)
	{
		var buf = new Int8Array(this.buffer, this.wpos, 1);
		buf[0] = v;
		this.wpos += 1;
	}

	this.writeInt16 = function(v)
	{	
		this.writeInt8(v & 0xff);
		this.writeInt8(v >> 8 & 0xff);
	}
		
	this.writeInt32 = function(v)
	{
		for(i=0; i<4; i++)
			this.writeInt8(v >> i * 8 & 0xff);
	}

	this.writeInt64 = function(v)
	{
		this.writeInt32(v.hi);
		this.writeInt32(v.lo);
	}
	
	this.writeUint8 = function(v)
	{
		var buf = new Uint8Array(this.buffer, this.wpos, 1);
		buf[0] = v;
		this.wpos += 1;
	}

	this.writeUint16 = function(v)
	{
		this.writeUint8(v & 0xff);
		this.writeUint8(v >> 8 & 0xff);
	}
		
	this.writeUint32 = function(v)
	{
		for(i=0; i<4; i++)
			this.writeUint8(v >> i * 8 & 0xff);
	}

	this.writeUint64 = function(v)
	{
		this.writeUint32(v.hi);
		this.writeUint32(v.lo);
	}
	
	this.writeFloat = function(v)
	{
		try
		{
			var buf = new Float32Array(this.buffer, this.wpos, 1);
			buf[0] = v;
		}
		catch(e)
		{
			var buf = new Float32Array(1);
			buf[0] = v;
			var buf1 = new Uint8Array(this.buffer);
			var buf2 = new Uint8Array(buf.buffer);
			buf1.set(buf2, this.wpos);
		}
		
		this.wpos += 4;
	}

	this.writeDouble = function(v)
	{
		try
		{
			var buf = new Float64Array(this.buffer, this.wpos, 1);
			buf[0] = v;
		}
		catch(e)
		{
			var buf = new Float64Array(1);
			buf[0] = v;
			var buf1 = new Uint8Array(this.buffer);
			var buf2 = new Uint8Array(buf.buffer);
			buf1.set(buf2, this.wpos);
		}

		this.wpos += 8;
	}

	this.writeBlob = function(v)
	{
		size = v.length;
		if(size + 4> this.space())
		{
			console.error("memorystream::writeBlob: no free!");
			return;
		}
		
		this.writeUint32(size);
		var buf = new Uint8Array(this.buffer, this.wpos, size);
		
		if(typeof(v) == "string")
		{
			for(i=0; i<size; i++)
			{
				buf[i] = v.charCodeAt(i);
			}
		}
		else
		{
			for(i=0; i<size; i++)
			{
				buf[i] = v[i];
			}
		}
		
		this.wpos += size;
	}
	
	this.writeString = function(v)
	{
		if(v.length > this.space())
		{
			console.error("memorystream::writeString: no free!");
			return;
		}
		
		var buf = new Uint8Array(this.buffer, this.wpos);
		var i = 0;
		for(idx=0; idx<v.length; idx++)
		{
			buf[i++] = v.charCodeAt(idx);
		}
		
		buf[i++] = 0;
		this.wpos += i;
	}
	
	//---------------------------------------------------------------------------------
	this.readSkip = function(v)
	{
		this.rpos += v;
	}
	
	//---------------------------------------------------------------------------------
	this.space = function()
	{
		return this.buffer.byteLength - this.wpos;
	}

	//---------------------------------------------------------------------------------
	this.length = function()
	{
		return this.wpos - this.rpos;
	}

	//---------------------------------------------------------------------------------
	this.readEOF = function()
	{
		return this.buffer.byteLength - this.rpos <= 0;
	}

	//---------------------------------------------------------------------------------
	this.done = function()
	{
		this.rpos = this.wpos;
	}
	
	//---------------------------------------------------------------------------------
	this.getbuffer = function(v)
	{
		return this.buffer.slice(this.rpos, this.wpos);
	}
}

/*-----------------------------------------------------------------------------------------
												bundle
-----------------------------------------------------------------------------------------*/
KBEngine.Bundle = function()
{
	this.memorystreams = new Array();
	this.stream = new KBEngine.MemoryStream(KBEngine.PACKET_MAX_SIZE_TCP);
	
	this.numMessage = 0;
	this.messageLengthBuffer = null;
	this.messageLength = 0;
	this.msgtype = null;
	
	//---------------------------------------------------------------------------------
	this.newMessage = function(msgtype)
	{
		this.fini(false);
		
		this.msgtype = msgtype;
		this.numMessage += 1;
		
		if(this.msgtype.length == -1)
		{
			this.messageLengthBuffer = new Uint8Array(this.stream.buffer, this.stream.wpos + KBEngine.MESSAGE_ID_LENGTH, 2);
		}
		
		this.writeUint16(msgtype.id);
		
		if(this.messageLengthBuffer)
		{
			this.writeUint16(0);
			this.messageLengthBuffer[0] = 0;
			this.messageLengthBuffer[1] = 0;
			this.messageLength = 0;
		}
	}

	//---------------------------------------------------------------------------------
	this.writeMsgLength = function(v)
	{
		if(this.messageLengthBuffer)
		{
			this.messageLengthBuffer[0] = v & 0xff;
			this.messageLengthBuffer[1] = v >> 8 & 0xff;
		}
	}
	
	//---------------------------------------------------------------------------------
	this.fini = function(issend)
	{
		if(this.numMessage > 0)
		{
			this.writeMsgLength(this.messageLength);
			if(this.stream)
				this.memorystreams.push(this.stream);
		}
		
		if(issend)
		{
			this.messageLengthBuffer = null;
			this.numMessage = 0;
			this.msgtype = null;
		}
	}
	
	//---------------------------------------------------------------------------------
	this.send = function(network)
	{
		this.fini(true);
		
		for(i=0; i<this.memorystreams.length; i++)
		{
			stream = this.memorystreams[i];
			network.send(stream.getbuffer());
		}
		
		this.memorystreams = new Array();
		this.stream = new KBEngine.MemoryStream(KBEngine.PACKET_MAX_SIZE_TCP);
	}
	
	//---------------------------------------------------------------------------------
	this.checkStream = function(v)
	{
		if(v > this.stream.space())
		{
			this.memorystreams.push(this.stream);
			this.stream = new KBEngine.MemoryStream(KBEngine.PACKET_MAX_SIZE_TCP);
		}

		this.messageLength += v;
	}
	
	//---------------------------------------------------------------------------------
	this.writeInt8 = function(v)
	{
		this.checkStream(1);
		this.stream.writeInt8(v);
	}

	this.writeInt16 = function(v)
	{
		this.checkStream(2);
		this.stream.writeInt16(v);
	}
		
	this.writeInt32 = function(v)
	{
		this.checkStream(4);
		this.stream.writeInt32(v);
	}

	this.writeInt64 = function(v)
	{
		this.checkStream(8);
		this.stream.writeInt64(v);
	}
	
	this.writeUint8 = function(v)
	{
		this.checkStream(1);
		this.stream.writeUint8(v);
	}

	this.writeUint16 = function(v)
	{
		this.checkStream(2);
		this.stream.writeUint16(v);
	}
		
	this.writeUint32 = function(v)
	{
		this.checkStream(4);
		this.stream.writeUint32(v);
	}

	this.writeUint64 = function(v)
	{
		this.checkStream(8);
		this.stream.writeUint64(v);
	}
	
	this.writeFloat = function(v)
	{
		this.checkStream(4);
		this.stream.writeFloat(v);
	}

	this.writeDouble = function(v)
	{
		this.checkStream(8);
		this.stream.writeDouble(v);
	}
	
	this.writeString = function(v)
	{
		this.checkStream(v.length + 1);
		this.stream.writeString(v);
	}
	
	this.writeBlob = function(v)
	{
		this.checkStream(v.length + 4);
		this.stream.writeBlob(v);
	}
}

/*-----------------------------------------------------------------------------------------
												messages
-----------------------------------------------------------------------------------------*/
KBEngine.reader = new KBEngine.MemoryStream(0);
KBEngine.datatype2id = {};
KBEngine.datatype2id["STRING"] = 1;
KBEngine.datatype2id["STD::STRING"] = 1;

KBEngine.datatype2id["UINT8"] = 2;
KBEngine.datatype2id["BOOL"] = 2;
KBEngine.datatype2id["DATATYPE"] = 2;
KBEngine.datatype2id["CHAR"] = 2;
KBEngine.datatype2id["DETAIL_TYPE"] = 2;
KBEngine.datatype2id["MAIL_TYPE"] = 2;

KBEngine.datatype2id["UINT16"] = 3;
KBEngine.datatype2id["UNSIGNED SHORT"] = 3;
KBEngine.datatype2id["SERVER_ERROR_CODE"] = 3;
KBEngine.datatype2id["ENTITY_TYPE"] = 3;
KBEngine.datatype2id["ENTITY_PROPERTY_UID"] = 3;
KBEngine.datatype2id["ENTITY_METHOD_UID"] = 3;
KBEngine.datatype2id["ENTITY_SCRIPT_UID"] = 3;
KBEngine.datatype2id["DATATYPE_UID"] = 3;

KBEngine.datatype2id["UINT32"] = 4;
KBEngine.datatype2id["UINT"] = 4;
KBEngine.datatype2id["UNSIGNED INT"] = 4;
KBEngine.datatype2id["ARRAYSIZE"] = 4;
KBEngine.datatype2id["SPACE_ID"] = 4;
KBEngine.datatype2id["GAME_TIME"] = 4;
KBEngine.datatype2id["TIMER_ID"] = 4;

KBEngine.datatype2id["UINT64"] = 5;
KBEngine.datatype2id["DBID"] = 5;
KBEngine.datatype2id["COMPONENT_ID"] = 5;

KBEngine.datatype2id["INT8"] = 6;
KBEngine.datatype2id["COMPONENT_ORDER"] = 6;

KBEngine.datatype2id["INT16"] = 7;
KBEngine.datatype2id["SHORT"] = 7;

KBEngine.datatype2id["INT32"] = 8;
KBEngine.datatype2id["INT"] = 8;
KBEngine.datatype2id["ENTITY_ID"] = 8;
KBEngine.datatype2id["CALLBACK_ID"] = 8;
KBEngine.datatype2id["COMPONENT_TYPE"] = 8;

KBEngine.datatype2id["INT64"] = 9;

KBEngine.datatype2id["PYTHON"] = 10;
KBEngine.datatype2id["PY_DICT"] = 10;
KBEngine.datatype2id["PY_TUPLE"] = 10;
KBEngine.datatype2id["PY_LIST"] = 10;
KBEngine.datatype2id["MAILBOX"] = 10;

KBEngine.datatype2id["BLOB"] = 11;

KBEngine.datatype2id["UNICODE"] = 12;

KBEngine.datatype2id["FLOAT"] = 13;

KBEngine.datatype2id["DOUBLE"] = 14;

KBEngine.datatype2id["VECTOR2"] = 15;

KBEngine.datatype2id["VECTOR3"] = 16;

KBEngine.datatype2id["VECTOR4"] = 17;

KBEngine.datatype2id["FIXED_DICT"] = 18;

KBEngine.datatype2id["ARRAY"] = 19;


KBEngine.bindwriter = function(writer, argType)
{
	if(argType == KBEngine.datatype2id["UINT8"])
	{
		return writer.writeUint8;
	}
	else if(argType == KBEngine.datatype2id["UINT16"])
	{
		return writer.writeUint16;
	}
	else if(argType == KBEngine.datatype2id["UINT32"])
	{
		return writer.writeUint32;
	}
	else if(argType == KBEngine.datatype2id["UINT64"])
	{
		return writer.writeUint64;
	}
	else if(argType == KBEngine.datatype2id["INT8"])
	{
		return writer.writeInt8;
	}
	else if(argType == KBEngine.datatype2id["INT16"])
	{
		return writer.writeInt16;
	}
	else if(argType == KBEngine.datatype2id["INT32"])
	{
		return writer.writeInt32;
	}
	else if(argType == KBEngine.datatype2id["INT64"])
	{
		return writer.writeInt64;
	}
	else if(argType == KBEngine.datatype2id["FLOAT"])
	{
		return writer.writeFloat;
	}
	else if(argType == KBEngine.datatype2id["DOUBLE"])
	{
		return writer.writeDouble;
	}
	else if(argType == KBEngine.datatype2id["STRING"])
	{
		return writer.writeString;
	}
	else if(argType == KBEngine.datatype2id["FIXED_DICT"])
	{
		return writer.writeStream;
	}
	else if(argType == KBEngine.datatype2id["ARRAY"])
	{
		return writer.writeStream;
	}
	else
	{
		return writer.writeStream;
	}
}

KBEngine.bindReader = function(argType)
{
	if(argType == KBEngine.datatype2id["UINT8"])
	{
		return KBEngine.reader.readUint8;
	}
	else if(argType == KBEngine.datatype2id["UINT16"])
	{
		return KBEngine.reader.readUint16;
	}
	else if(argType == KBEngine.datatype2id["UINT32"])
	{
		return KBEngine.reader.readUint32;
	}
	else if(argType == KBEngine.datatype2id["UINT64"])
	{
		return KBEngine.reader.readUint64;
	}
	else if(argType == KBEngine.datatype2id["INT8"])
	{
		return KBEngine.reader.readInt8;
	}
	else if(argType == KBEngine.datatype2id["INT16"])
	{
		return KBEngine.reader.readInt16;
	}
	else if(argType == KBEngine.datatype2id["INT32"])
	{
		return KBEngine.reader.readInt32;
	}
	else if(argType == KBEngine.datatype2id["INT64"])
	{
		return KBEngine.reader.readInt64;
	}
	else if(argType == KBEngine.datatype2id["FLOAT"])
	{
		return KBEngine.reader.readFloat;
	}
	else if(argType == KBEngine.datatype2id["DOUBLE"])
	{
		return KBEngine.reader.readDouble;
	}
	else if(argType == KBEngine.datatype2id["STRING"])
	{
		return KBEngine.reader.readString;
	}
	else if(argType == KBEngine.datatype2id["PYTHON"])
	{
		return KBEngine.reader.readStream;
	}
	else if(argType == KBEngine.datatype2id["VECTOR2"])
	{
		return KBEngine.reader.readStream;
	}
	else if(argType == KBEngine.datatype2id["VECTOR3"])
	{
		return KBEngine.reader.readStream;
	}
	else if(argType == KBEngine.datatype2id["VECTOR4"])
	{
		return KBEngine.reader.readStream;
	}
	else if(argType == KBEngine.datatype2id["BLOB"])
	{
		return KBEngine.reader.readStream;
	}
	else if(argType == KBEngine.datatype2id["UNICODE"])
	{
		return KBEngine.reader.readStream;
	}
	else if(argType == KBEngine.datatype2id["FIXED_DICT"])
	{
		return KBEngine.reader.readStream;
	}
	else if(argType == KBEngine.datatype2id["ARRAY"])
	{
		return KBEngine.reader.readStream;
	}
	else
	{
		return KBEngine.reader.readStream;
	}
}
	
KBEngine.Message = function(id, name, length, argstype, args, handler)
{
	this.id = id;
	this.name = name;
	this.length = length;
	this.argsType = argstype;
	
	// ��ִ��
	for(i=0; i<args.length; i++)
	{
		args[i] = KBEngine.bindReader(args[i]);
	}
	
	this.args = args;
	this.handler = handler;
	
	this.createFromStream = function(msgstream)
	{
		if(this.args.length <= 0)
			return msgstream;
		
		var result = new Array(this.args.length);
		for(i=0; i<this.args.length; i++)
		{
			result[i] = this.args[i].call(msgstream);
		}
		
		return result;
	}
	
	this.handleMessage = function(msgstream)
	{
		if(this.handler == null)
		{
			console.error("KBEngine.Message::handleMessage: interface(" + this.name + "/" + this.id + ") no implement!");  
			return;
		}

		if(this.args.length <= 0)
		{
			if(this.argsType < 0)
				this.handler(msgstream);
			else
				this.handler();
		}
		else
		{
			this.handler.apply(g_kbengine, this.createFromStream(msgstream));
		}
	}
}

// ������Ϣ
KBEngine.messages = {};
KBEngine.messages["loginapp"] = {};
KBEngine.messages["baseapp"] = {};
KBEngine.clientmessages = {};

KBEngine.messages["Loginapp_importClientMessages"] = new KBEngine.Message(5, "importClientMessages", 0, 0, new Array(), null);
KBEngine.messages["Baseapp_importClientMessages"] = new KBEngine.Message(207, "importClientMessages", 0, 0, new Array(), null);
KBEngine.messages["Baseapp_importClientEntityDef"] = new KBEngine.Message(208, "importClientEntityDef", 0, 0, new Array(), null);
KBEngine.messages["onImportClientMessages"] = new KBEngine.Message(518, "onImportClientMessages", -1, -1, new Array(), null);

KBEngine.bufferedCreateEntityMessage = {};

/*-----------------------------------------------------------------------------------------
												entity
-----------------------------------------------------------------------------------------*/
KBEngine.Entity = KBEngine.Class.extend({
	init : function()
	{
		this.id = 0;
		this.className = "";
		this.position = [0.0, 0.0, 0.0];
		this.direction = [0.0, 0.0, 0.0];
		this.velocity = 0.0
			
		this.cell = null;
		this.base = null;
		
		this.inWorld = false;
	},

	onInit : function()
	{
	},
		
	baseCall : function()
	{
		if(arguments.length < 1)
		{
			console.error('KBEngine.Entity::baseCall: not fount interfaceName!');  
			return;
		}
		
		var method = KBEngine.moduledefs[this.className].base_methods[arguments[0]];
		var methodID = method[0];
		var args = method[3];
		
		if(arguments.length - 1 != args.length)
		{
			console.error("KBEngine.Entity::baseCall: args(" + (arguments.length - 1) + "!= " + args.length + ") size is error!");  
			return;
		}
		
		this.base.newMail();
		this.base.bundle.writeUint16(methodID);
		
		try
		{
			for(var i=0; i<args.length; i++)
			{
				args[i].addToStream(this.base.bundle, arguments[i + 1]);
			}
		}
		catch(e)
		{
			console.error('KBEngine.Entity::baseCall: args is error!');  
			this.base.bundle = null;
			return;
		}
		
		this.base.postMail();
	},
	
	cellCall : function()
	{
		if(arguments.length < 1)
		{
			console.error('KBEngine.Entity::cellCall: not fount interfaceName!');  
			return;
		}
		
		var method = KBEngine.moduledefs[this.className].cell_methods[arguments[0]];
		var methodID = method[0];
		var args = method[3];
		
		if(arguments.length - 1 != args.length)
		{
			console.error("KBEngine.Entity::cellCall: args(" + (arguments.length - 1) + "!= " + args.length + ") size is error!");  
			return;
		}
		
		this.cell.newMail();
		this.cell.bundle.writeUint16(methodID);
		
		try
		{
			for(var i=0; i<args.length; i++)
			{
				bindwriter(args[i])(arguments[i + 1]);
			}
		}
		catch(e)
		{
			console.error('KBEngine.Entity::cellCall: args is error!');  
			this.cell.bundle = null;
			return;
		}
		
		this.cell.postMail();
	},
	
	onEnterWorld : function()
	{
		console.info(this.className + '::onEnterWorld: ' + this.id); 
		this.inWorld = true;
	},
	
	onLeaveWorld : function()
	{
		console.info(this.className + '::onLeaveWorld: ' + this.id); 
		this.inWorld = false;
	},
	
	onEnterSpace : function()
	{
		console.info(this.className + '::onEnterSpace: ' + this.id); 
	},
	
	onLeaveSpace : function()
	{
		console.info(this.className + '::onLeaveSpace: ' + this.id); 
	}
});

/*-----------------------------------------------------------------------------------------
												entity
-----------------------------------------------------------------------------------------*/
KBEngine.MAILBOX_TYPE_CELL = 0;
KBEngine.MAILBOX_TYPE_BASE = 1;

KBEngine.Mailbox = function()
{
	this.id = 0;
	this.className = "";
	this.type = KBEngine.MAILBOX_TYPE_CELL;
	this.networkInterface = g_kbengine;
	
	this.bundle = null;
	
	this.isBase = function()
	{
		return this.type == KBEngine.MAILBOX_TYPE_BASE;
	}

	this.isCell = function()
	{
		return this.type == KBEngine.MAILBOX_TYPE_CELL;
	}
	
	this.newMail = function()
	{  
		if(this.bundle == null)
			this.bundle = new KBEngine.Bundle();
		
		if(this.type == KBEngine.MAILBOX_TYPE_CELL)
			this.bundle.newMessage(KBEngine.messages.Baseapp_onRemoteCallCellMethodFromClient);
		else
			this.bundle.newMessage(KBEngine.messages.Base_onRemoteMethodCall);

		this.bundle.writeInt32(this.id);
		
		return this.bundle;
	}
	
	this.postMail = function(bundle)
	{
		if(bundle == undefined)
			bundle = this.bundle;
		
		bundle.send(this.networkInterface);
		
		if(this.bundle == bundle)
			this.bundle = null;
	}
}

/*-----------------------------------------------------------------------------------------
												entitydef
-----------------------------------------------------------------------------------------*/
KBEngine.moduledefs = {};
KBEngine.datatypes = {};

function KBEDATATYPE_UINT8()
{
	this.bind = function()
	{
	}
	
	this.createFromStream = function(stream)
	{
		return KBEngine.reader.readUint8.call(stream);
	}
	
	this.addToStream = function(stream, v)
	{
		stream.writeUint8(v);
	}

	this.parseDefaultValStr = function(v)
	{
		return eval(v);
	}
}

function KBEDATATYPE_UINT16()
{
	this.bind = function()
	{
	}
	
	this.createFromStream = function(stream)
	{
		return KBEngine.reader.readUint16.call(stream);
	}
	
	this.addToStream = function(stream, v)
	{
		stream.writeUint16(v);
	}
	
	this.parseDefaultValStr = function(v)
	{
		return eval(v);
	}
}

function KBEDATATYPE_UINT32()
{
	this.bind = function()
	{
	}
	
	this.createFromStream = function(stream)
	{
		return KBEngine.reader.readUint32.call(stream);
	}
	
	this.addToStream = function(stream, v)
	{
		stream.writeUint32(v);
	}
	
	this.parseDefaultValStr = function(v)
	{
		return eval(v);
	}
}

function KBEDATATYPE_UINT64()
{
	this.bind = function()
	{
	}
	
	this.createFromStream = function(stream)
	{
		return KBEngine.reader.readUint64.call(stream);
	}
	
	this.addToStream = function(stream, v)
	{
		stream.writeUint64(v);
	}
	
	this.parseDefaultValStr = function(v)
	{
		return eval(v);
	}
}

function KBEDATATYPE_INT8()
{
	this.bind = function()
	{
	}
	
	this.createFromStream = function(stream)
	{
		return KBEngine.reader.readInt8.call(stream);
	}
	
	this.addToStream = function(stream, v)
	{
		stream.writeInt8(v);
	}
	
	this.parseDefaultValStr = function(v)
	{
		return eval(v);
	}
}

function KBEDATATYPE_INT16()
{
	this.bind = function()
	{
	}
	
	this.createFromStream = function(stream)
	{
		return KBEngine.reader.readInt16.call(stream);
	}
	
	this.addToStream = function(stream, v)
	{
		stream.writeInt16(v);
	}
	
	this.parseDefaultValStr = function(v)
	{
		return eval(v);
	}
}

function KBEDATATYPE_INT32()
{
	this.bind = function()
	{
	}
	
	this.createFromStream = function(stream)
	{
		return KBEngine.reader.readInt32.call(stream);
	}
	
	this.addToStream = function(stream, v)
	{
		stream.writeInt32(v);
	}
	
	this.parseDefaultValStr = function(v)
	{
		return eval(v);
	}
}

function KBEDATATYPE_INT64()
{
	this.bind = function()
	{
	}
	
	this.createFromStream = function(stream)
	{
		return KBEngine.reader.readInt64.call(stream);
	}
	
	this.addToStream = function(stream, v)
	{
		stream.writeInt64(v);
	}
	
	this.parseDefaultValStr = function(v)
	{
		return eval(v);
	}
}

function KBEDATATYPE_FLOAT()
{
	this.bind = function()
	{
	}
	
	this.createFromStream = function(stream)
	{
		return KBEngine.reader.readFloat.call(stream);
	}
	
	this.addToStream = function(stream, v)
	{
		stream.writeFloat(v);
	}
	
	this.parseDefaultValStr = function(v)
	{
		return eval(v);
	}
}

function KBEDATATYPE_DOUBLE()
{
	this.bind = function()
	{
	}
	
	this.createFromStream = function(stream)
	{
		return KBEngine.reader.readDouble.call(stream);
	}
	
	this.addToStream = function(stream, v)
	{
		stream.writeDouble(v);
	}
	
	this.parseDefaultValStr = function(v)
	{
		return eval(v);
	}
}

function KBEDATATYPE_STRING()
{
	this.bind = function()
	{
	}
	
	this.createFromStream = function(stream)
	{
		return KBEngine.reader.readString.call(stream);
	}
	
	this.addToStream = function(stream, v)
	{
		stream.writeString(v);
	}
	
	this.parseDefaultValStr = function(v)
	{
		return eval(v);
	}
}

function KBEDATATYPE_VECTOR(size)
{
	this.itemsize = size;
	
	this.bind = function()
	{
	}
	
	this.createFromStream = function(stream)
	{
		var data = new Array(this.itemsize);
		var size = KBEngine.reader.readUint32.call(stream);
		if(size != this.itemsize)
		{
			console.error("KBEDATATYPE_VECTOR::createFromStream: size(" + size + ") != thisSize(" + this.itemsize + ") !");
			return undefined;
		}
		
		for(var i=0; i<this.itemsize; i++)
		{
			if(KBEngine.CLIENT_NO_FLOAT)
				data[i] = KBEngine.reader.readInt32.call(stream);
			else
				data[i] = KBEngine.reader.readFloat.call(stream);
		}
		
		return data;
	}
	
	this.addToStream = function(stream, v)
	{
		stream.writeUint32(this.itemsize);
		
		for(var i=0; i<this.itemsize; i++)
		{
			if(KBEngine.CLIENT_NO_FLOAT)
				stream.writeInt32(v[i]);
			else
				stream.writeFloat(v[i]);
		}
	}
	
	this.parseDefaultValStr = function(v)
	{
		return eval(v);
	}
}

function KBEDATATYPE_PYTHON()
{
	this.bind = function()
	{
	}
	
	this.createFromStream = function(stream)
	{
	}
	
	this.addToStream = function(stream, v)
	{
	}
	
	this.parseDefaultValStr = function(v)
	{
		return eval(v);
	}
}

function KBEDATATYPE_UNICODE()
{
	this.bind = function()
	{
	}
	
	this.createFromStream = function(stream)
	{
		return KBEngine.reader.readBlob.call(stream);
	}
	
	this.addToStream = function(stream, v)
	{
		stream.writeBlob(v);
	}
	
	this.parseDefaultValStr = function(v)
	{
		return eval(v);
	}
}

function KBEDATATYPE_MAILBOX()
{
	this.bind = function()
	{
	}
	
	this.createFromStream = function(stream)
	{
	}
	
	this.addToStream = function(stream, v)
	{
	}
	
	this.parseDefaultValStr = function(v)
	{
		return eval(v);
	}
}

function KBEDATATYPE_BLOB()
{
	this.bind = function()
	{
	}
	
	this.createFromStream = function(stream)
	{
		var size = KBEngine.reader.readUint32.call(stream);
		var buf = new Uint8Array(stream.buffer, stream.rpos, size);
		stream.rpos += size;
		return buf;
	}
	
	this.addToStream = function(stream, v)
	{
		stream.writeBlob(v);
	}
	
	this.parseDefaultValStr = function(v)
	{
		return eval(v);
	}
}

function KBEDATATYPE_ARRAY()
{
	this.type = null;
	
	this.bind = function()
	{
		if(!isNaN(this.type))
			this.type = KBEngine.datatypes[this.type];
		else
			this.type.bind();
	}
	
	this.createFromStream = function(stream)
	{
		var size = stream.readUint32();
		var datas = [];
		
		while(size > 0)
		{
			size--;
			datas.push(this.type.createFromStream(stream));
		};
		
		return datas;
	}
	
	this.addToStream = function(stream, v)
	{
		stream.writeUint32(v.length);
		for(var i=0; i<v.length; i++)
		{
			this.type.addToStream(stream, v[i]);
		}
	}
	
	this.parseDefaultValStr = function(v)
	{
		return eval(v);
	}
}

function KBEDATATYPE_FIXED_DICT()
{
	this.dicttype = {};
	this.implementedBy = null;
	
	this.bind = function()
	{
		for(itemkey in this.dicttype)
		{
			var utype = this.dicttype[itemkey];
			
			if(!isNaN(utype))
				this.dicttype[itemkey] = KBEngine.datatypes[utype];
			else
				this.dicttype[itemkey].bind();
		}
	}
	
	this.createFromStream = function(stream)
	{
		var datas = {};
		for(itemkey in this.dicttype)
		{
			datas[itemkey] = this.dicttype[itemkey].createFromStream(stream);
		}
		
		return datas;
	}
	
	this.addToStream = function(stream, v)
	{
		for(itemkey in this.dicttype)
		{
			this.dicttype[itemkey].addToStream(stream, v[itemkey]);
		}
	}
	
	this.parseDefaultValStr = function(v)
	{
		return eval(v);
	}
}

KBEngine.datatypes["UINT8"] = new KBEDATATYPE_UINT8();
KBEngine.datatypes["UINT16"] = new KBEDATATYPE_UINT16();
KBEngine.datatypes["UINT32"] = new KBEDATATYPE_UINT32();
KBEngine.datatypes["UINT64"] = new KBEDATATYPE_UINT64();

KBEngine.datatypes["INT8"] = new KBEDATATYPE_INT8();
KBEngine.datatypes["INT16"] = new KBEDATATYPE_INT16();
KBEngine.datatypes["INT32"] = new KBEDATATYPE_INT32();
KBEngine.datatypes["INT64"] = new KBEDATATYPE_INT64();

KBEngine.datatypes["FLOAT"] = new KBEDATATYPE_FLOAT();
KBEngine.datatypes["DOUBLE"] = new KBEDATATYPE_DOUBLE();

KBEngine.datatypes["STRING"] = new KBEDATATYPE_STRING();
KBEngine.datatypes["VECTOR2"] = new KBEDATATYPE_VECTOR(2);
KBEngine.datatypes["VECTOR3"] = new KBEDATATYPE_VECTOR(3);
KBEngine.datatypes["VECTOR4"] = new KBEDATATYPE_VECTOR(4);
KBEngine.datatypes["PYTHON"] = new KBEDATATYPE_PYTHON();
KBEngine.datatypes["UNICODE"] = new KBEDATATYPE_UNICODE();
KBEngine.datatypes["MAILBOX"] = new KBEDATATYPE_MAILBOX();
KBEngine.datatypes["BLOB"] = new KBEDATATYPE_BLOB();

/*-----------------------------------------------------------------------------------------
												system
-----------------------------------------------------------------------------------------*/
KBEngine.KBEngineApp = function()
{
	this.username = "testhtml51";
	this.password = "123456";
	this.loginappMessageImported = false;
	this.baseappMessageImported = false;
	this.entitydefImported = false;
	
	this.reset = function()
	{  
		this.socket = null;
		this.ip = "127.0.0.1";
		this.port = 20013;
		this.currserver = "loginapp";
		this.currstate = "create";
		this.serverdatas = "";
		this.clientdatas = "";
		this.serverVersion = "";
		this.serverScriptVersion = "";
		this.serverProtocolMD5 = "";
		this.serverEntityDefMD5 = "";
		this.clientVersion = "0.4.0";
		this.clientScriptVersion = "0.1.0";
		this.entity_uuid = null;
		this.entity_id = 0;
		this.entity_type = "";
		this.entities = {};
		this.entityIDAliasIDList = [];
		this.spacedata = {};
		var dateObject = new Date();
		this.lastticktime = dateObject.getTime();
		this.spaceID = 0;
		this.spaceResPath = "";
		this.isLoadedGeometry = false;
		this.isOnGound = false;
		this.component = "client";
	}
	
	this.reset();
	
	this.hello = function()
	{  
		var bundle = new KBEngine.Bundle();
		
		if(g_kbengine.currserver == "loginapp")
			bundle.newMessage(KBEngine.messages.Loginapp_hello);
		else
			bundle.newMessage(KBEngine.messages.Baseapp_hello);
		
		bundle.writeString(g_kbengine.clientVersion);
		bundle.writeString(g_kbengine.clientScriptVersion);
		bundle.writeBlob(g_kbengine.clientdatas);
		bundle.send(g_kbengine);
	}

	this.player = function()
	{
		return g_kbengine.entities[g_kbengine.entity_id];
	}
	
	this.connect = function(addr)
	{
		try{  
			if(g_kbengine.socket != null)
				g_kbengine.socket.close();
		}
		catch(e){ 
		}
		
		g_kbengine.socket = null;
		try{  
			g_kbengine.socket = new WebSocket(addr);  
		}catch(e){  
			console.error('WebSocket init error!');  
			return;  
		}
		
		g_kbengine.socket.binaryType = "arraybuffer";
		g_kbengine.socket.onopen = g_kbengine.onopen;  
		g_kbengine.socket.onerror = g_kbengine.onerror;  
		g_kbengine.socket.onmessage = g_kbengine.onmessage;  
		g_kbengine.socket.onclose = g_kbengine.onclose;
	}

	this.onopen = function(){  
		console.info('connect success!') ; 
	}

	this.onerror = function(evt){  
		console.error('connect error:' + evt.data);
	}
	
	this.onmessage = function(msg)
	{ 
		var stream = new KBEngine.MemoryStream(msg.data);
		stream.wpos = msg.data.byteLength;
		
		while(stream.rpos < stream.wpos)
		{
			var msgid = stream.readUint16();
			var msgHandler = KBEngine.clientmessages[msgid];
			
			if(!msgHandler)
			{
				console.error("KBENGINE::onmessage[" + g_kbengine.currserver + "]: not found msg(" + msgid + ")!");
			}
			else
			{
				var msglen = msgHandler.length;
				if(msglen == -1)
				{
					msglen = stream.readUint16();
					
					// ��չ����
					if(msglen == 65535)
						msglen = stream.readUint32();
				}
			
				var wpos = stream.wpos;
				var rpos = stream.rpos + msglen;
				stream.wpos = rpos;
				msgHandler.handleMessage(stream);
				stream.wpos = wpos;
				stream.rpos = rpos;
			}
		}
	}  

	this.onclose = function(){  
		console.info('connect close:' + g_kbengine.currserver);
		
		//if(g_kbengine.currserver != "loginapp")
		//	g_kbengine.reset();
	}

	this.send = function(msg)
	{
		g_kbengine.socket.send(msg);
	}

	this.close = function(){  
		g_kbengine.socket.close();  
		g_kbengine.reset();
	}
	
	this.update = function()
	{
		if(g_kbengine.socket == null)
			return;

		var dateObject = new Date();
		if((dateObject.getTime() - g_kbengine.lastticktime) / 1000 > 15)
		{
			if(g_kbengine.currserver == "loginapp")
			{
				if(KBEngine.messages.Loginapp_onClientActiveTick != undefined)
				{
					var bundle = new KBEngine.Bundle();
					bundle.newMessage(KBEngine.messages.Loginapp_onClientActiveTick);
					bundle.send(g_kbengine);
				}
			}
			else
			{
				if(KBEngine.messages.Baseapp_onClientActiveTick != undefined)
				{
					var bundle = new KBEngine.Bundle();
					bundle.newMessage(KBEngine.messages.Baseapp_onClientActiveTick);
					bundle.send(g_kbengine);
				}
			}
			
			g_kbengine.lastticktime = dateObject.getTime();
		}
		
		g_kbengine.updatePlayerToServer();
	}
	
	this.onOpenLoginapp_login = function()
	{  
		console.info("KBENGINE::onOpenLoginapp_login: successfully!");
		g_kbengine.currserver = "loginapp";
		g_kbengine.currstate = "login";
		
		if(!g_kbengine.loginappMessageImported)
		{
			var bundle = new KBEngine.Bundle();
			bundle.newMessage(KBEngine.messages.Loginapp_importClientMessages);
			bundle.send(g_kbengine);
			g_kbengine.socket.onmessage = g_kbengine.Client_onImportClientMessages;  
			console.info("KBENGINE::onOpenLoginapp_login: start importClientMessages ...");
		}
		else
		{
			g_kbengine.onImportClientMessagesCompleted();
		}
	}
	
	this.onOpenLoginapp_createAccount = function()
	{  
		console.info("KBENGINE::onOpenLoginapp_createAccount: successfully!");
		g_kbengine.currserver = "loginapp";
		g_kbengine.currstate = "createAccount";
		
		if(!g_kbengine.loginappMessageImported)
		{
			var bundle = new KBEngine.Bundle();
			bundle.newMessage(KBEngine.messages.Loginapp_importClientMessages);
			bundle.send(g_kbengine);
			g_kbengine.socket.onmessage = g_kbengine.Client_onImportClientMessages;  
			console.info("KBENGINE::onOpenLoginapp_createAccount: start importClientMessages ...");
		}
		else
		{
			g_kbengine.onImportClientMessagesCompleted();
		}
	}
	
	this.onImportClientMessagesCompleted = function()
	{
		console.info("KBENGINE::onImportClientMessagesCompleted: successfully!");
		g_kbengine.socket.onmessage = g_kbengine.onmessage; 
		g_kbengine.hello();
		
		if(g_kbengine.currserver == "loginapp")
		{
			if(g_kbengine.currstate == "login")
				g_kbengine.login_loginapp(false);
			else if(g_kbengine.currstate == "resetpassword")
				g_kbengine.resetpassword_loginapp(false);
			else
				g_kbengine.createAccount_loginapp(false);
			
			g_kbengine.loginappMessageImported = true;
		}
		else
		{
			g_kbengine.baseappMessageImported = true;
			
			if(!g_kbengine.entitydefImported)
			{
				console.info("KBENGINE::onImportClientMessagesCompleted: start importEntityDef ...");
				var bundle = new KBEngine.Bundle();
				bundle.newMessage(KBEngine.messages.Baseapp_importClientEntityDef);
				bundle.send(g_kbengine);
			}
			else
			{
				g_kbengine.onImportEntityDefCompleted();
			}
		}
	}
	
	this.createDataTypeFromStream = function(stream, canprint)
	{
		var utype = stream.readUint16();
		var name = stream.readString();
		var valname = stream.readString();
		
		if(canprint)
			console.info("KBENGINE::Client_onImportClientEntityDef: importAlias(" + name + ":" + valname + ")!");
		
		if(valname == "FIXED_DICT")
		{
			var datatype = new KBEDATATYPE_FIXED_DICT();
			var keysize = stream.readUint8();
			datatype.implementedBy = stream.readString();
				
			while(keysize > 0)
			{
				keysize--;
				
				var keyname = stream.readString();
				var keyutype = stream.readUint16();
				datatype.dicttype[keyname] = keyutype;
			};
			
			KBEngine.datatypes[name] = datatype;
		}
		else if(valname == "ARRAY")
		{
			var uitemtype = stream.readUint16();
			var datatype = new KBEDATATYPE_ARRAY();
			datatype.type = uitemtype;
			KBEngine.datatypes[name] = datatype;
		}
		else
		{
			KBEngine.datatypes[name] = KBEngine.datatypes[valname];
		}

		KBEngine.datatypes[utype] = KBEngine.datatypes[name];
		KBEngine.datatype2id[name] = KBEngine.datatype2id[valname];
	}
	
	this.Client_onImportClientEntityDef = function(stream)
	{
		var aliassize = stream.readUint16();
		console.info("KBENGINE::Client_onImportClientEntityDef: importAlias(size=" + aliassize + ")!");
		
		while(aliassize > 0)
		{
			aliassize--;
			g_kbengine.createDataTypeFromStream(stream, true);
		};
	
		for(datatype in KBEngine.datatypes)
		{
			if(isNaN(datatype) && KBEngine.datatypes[datatype] != undefined)
			{
				KBEngine.datatypes[datatype].bind();
			}
		}
		
		while(!stream.readEOF())
		{
			var scriptmethod_name = stream.readString();
			var scriptUtype = stream.readUint16();
			var propertysize = stream.readUint16();
			var methodsize = stream.readUint16();
			var base_methodsize = stream.readUint16();
			var cell_methodsize = stream.readUint16();
			
			console.info("KBENGINE::Client_onImportClientEntityDef: import(" + scriptmethod_name + "), propertys(" + propertysize + "), " +
					"clientMethods(" + methodsize + "), baseMethods(" + base_methodsize + "), cellMethods(" + cell_methodsize + ")!");
			
			KBEngine.moduledefs[scriptmethod_name] = {};
			var currModuleDefs = KBEngine.moduledefs[scriptmethod_name];
			currModuleDefs["name"] = scriptmethod_name;
			currModuleDefs["propertys"] = {};
			currModuleDefs["methods"] = {};
			currModuleDefs["base_methods"] = {};
			currModuleDefs["cell_methods"] = {};
			KBEngine.moduledefs[scriptUtype] = currModuleDefs;
			
			var self_propertys = currModuleDefs["propertys"];
			var self_methods = currModuleDefs["methods"];
			var self_base_methods = currModuleDefs["base_methods"];
			var self_cell_methods= currModuleDefs["cell_methods"];
			
			try
			{
				var Class = eval(scriptmethod_name);
			}
			catch(e)
			{
				var Class = undefined;
			}
			
			while(propertysize > 0)
			{
				propertysize--;
				
				var properUtype = stream.readUint16();
				var aliasID = stream.readInt16();
				var name = stream.readString();
				var defaultValStr = stream.readString();
				var utype = KBEngine.datatypes[stream.readUint16()];
				var setmethod = null;
				if(Class != undefined)
				{
					setmethod = Class.prototype["set_" + name];
					if(setmethod == undefined)
						setmethod = null;
				}
				
				var savedata = [properUtype, aliasID, name, defaultValStr, utype, setmethod];
				self_propertys[name] = savedata;
				
				if(aliasID >= 0)
				{
					self_propertys[aliasID] = savedata;
					currModuleDefs["usePropertyDescrAlias"] = true;
				}
				else
				{
					self_propertys[properUtype] = savedata;
					currModuleDefs["usePropertyDescrAlias"] = false;
				}
				
				console.info("KBENGINE::Client_onImportClientEntityDef: add(" + scriptmethod_name + "), property(" + name + "/" + properUtype + ").");
			};
			
			while(methodsize > 0)
			{
				methodsize--;
				
				var methodUtype = stream.readUint16();
				var aliasID = stream.readInt16();
				var name = stream.readString();
				var argssize = stream.readUint8();
				var args = [];
				
				while(argssize > 0)
				{
					argssize--;
					args.push(KBEngine.datatypes[stream.readUint16()]);
				};
				
				var savedata = [methodUtype, aliasID, name, args];
				self_methods[name] = savedata;
				
				if(aliasID >= 0)
				{
					self_methods[aliasID] = savedata;
					currModuleDefs["useMethodDescrAlias"] = true;
				}
				else
				{
					self_methods[methodUtype] = savedata;
					currModuleDefs["useMethodDescrAlias"] = false;
				}
				
				console.info("KBENGINE::Client_onImportClientEntityDef: add(" + scriptmethod_name + "), method(" + name + ").");
			};

			while(base_methodsize > 0)
			{
				base_methodsize--;
				
				var methodUtype = stream.readUint16();
				var aliasID = stream.readInt16();
				var name = stream.readString();
				var argssize = stream.readUint8();
				var args = [];
				
				while(argssize > 0)
				{
					argssize--;
					args.push(KBEngine.datatypes[stream.readUint16()]);
				};
				
				self_base_methods[name] = [methodUtype, aliasID, name, args];
				console.info("KBENGINE::Client_onImportClientEntityDef: add(" + scriptmethod_name + "), base_method(" + name + ").");
			};
			
			while(cell_methodsize > 0)
			{
				cell_methodsize--;
				
				var methodUtype = stream.readUint16();
				var aliasID = stream.readInt16();
				var name = stream.readString();
				var argssize = stream.readUint8();
				var args = [];
				
				while(argssize > 0)
				{
					argssize--;
					args.push(KBEngine.datatypes[stream.readUint16()]);
				};
				
				self_cell_methods[name] = [methodUtype, aliasID, name, args];
				console.info("KBENGINE::Client_onImportClientEntityDef: add(" + scriptmethod_name + "), cell_method(" + name + ").");
			};
			
			try
			{
				defmethod = eval(scriptmethod_name);
			}
			catch(e)
			{
				console.error("KBENGINE::Client_onImportClientEntityDef: module(" + scriptmethod_name + ") not found!");
				defmethod = undefined;
			}
			
			for(name in currModuleDefs.propertys)
			{
				var infos = currModuleDefs.propertys[name];
				var properUtype = infos[0];
				var aliasID = infos[1];
				var name = infos[2];
				var defaultValStr = infos[3];
				var utype = infos[4];

				if(defmethod != undefined)
					defmethod.prototype[name] = utype.parseDefaultValStr(defaultValStr);
			};

			for(name in currModuleDefs.methods)
			{
				var infos = currModuleDefs.methods[name];
				var properUtype = infos[0];
				var aliasID = infos[1];
				var name = infos[2];
				var args = infos[3];
				
				if(defmethod != undefined && defmethod.prototype[name] == undefined)
				{
					console.warn(scriptmethod_name + ":: method(" + name + ") no implement!");
				}
			};
		}
		
		g_kbengine.onImportEntityDefCompleted();
	}

	this.Client_onVersionNotMatch = function(stream)
	{
		this.serverVersion = stream.readString();
		console.error("Client_onVersionNotMatch: verInfo=" + g_kbengine.clientVersion + " not match(server: " + this.serverVersion + ")");
	}

	this.Client_onScriptVersionNotMatch = function(stream)
	{
		this.serverScriptVersion = stream.readString();
		console.error("Client_onScriptVersionNotMatch: verInfo=" + g_kbengine.clientScriptVersion + " not match(server: " + this.serverScriptVersion + ")");
	}
	
	this.onImportEntityDefCompleted = function()
	{
		console.info("KBENGINE::onImportEntityDefCompleted: successfully!");
		g_kbengine.entitydefImported = true;
		g_kbengine.login_baseapp(false);
	}
	
	this.Client_onImportClientMessages = function(msg)
	{
		var stream = new KBEngine.MemoryStream(msg.data);
		var msgid = stream.readUint16();

		if(msgid == KBEngine.messages.onImportClientMessages.id)
		{
			var msglen = stream.readUint16();
			var msgcount = stream.readUint16();
			
			console.info("KBENGINE::onImportClientMessages: start(" + msgcount + ") ...!");
			
			while(msgcount > 0)
			{
				msgcount--;
				
				msgid = stream.readUint16();
				msglen = stream.readInt16();
				var msgname = stream.readString();
				var argtype = stream.readInt8();
				var argsize = stream.readUint8();
				var argstypes = new Array(argsize);
				
				for(var i=0; i<argsize; i++)
				{
					argstypes[i] = stream.readUint8();
				}
				
				var handler = null;
				var isClientMethod = msgname.indexOf("Client_") >= 0;
				if(isClientMethod)
				{
					handler = g_kbengine[msgname];
					if(handler == null || handler == undefined)
					{
						console.warn("KBENGINE::onImportClientMessages[" + g_kbengine.currserver + "]: interface(" + msgname + "/" + msgid + ") no implement!");
						handler = null;
					}
					else
					{
						console.info("KBENGINE::onImportClientMessages: import(" + msgname + ") successfully!");
					}
				}
			
				if(msgname.length > 0)
				{
					KBEngine.messages[msgname] = new KBEngine.Message(msgid, msgname, msglen, argtype, argstypes, handler);
					
					if(isClientMethod)
						KBEngine.clientmessages[msgid] = KBEngine.messages[msgname];
					else
						KBEngine.messages[g_kbengine.currserver][msgid] = KBEngine.messages[msgname];
				}
				else
				{
					KBEngine.messages[g_kbengine.currserver][msgid] = new KBEngine.Message(msgid, msgname, msglen, argtype, argstypes, handler);
				}
			};

			g_kbengine.onImportClientMessagesCompleted();
		}
		else
			console.error("KBENGINE::onmessage: not found msg(" + msgid + ")!");
	}
	
	this.createAccount = function(username, password)
	{  
		g_kbengine.username = username;
		g_kbengine.password = password;
		
		g_kbengine.createAccount_loginapp(true);
	}
	
	this.createAccount_loginapp = function(noconnect)
	{  
		if(noconnect)
		{
			console.info("KBENGINE::createAccount_loginapp: start connect to ws://" + g_kbengine.ip + ":" + g_kbengine.port + "!");
			g_kbengine.connect("ws://" + g_kbengine.ip + ":" + g_kbengine.port);
			g_kbengine.socket.onopen = g_kbengine.onOpenLoginapp_createAccount;  
		}
		else
		{
			var bundle = new KBEngine.Bundle();
			bundle.newMessage(KBEngine.messages.Loginapp_reqCreateAccount);
			bundle.writeString(g_kbengine.username);
			bundle.writeString(g_kbengine.password);
			bundle.writeBlob("");
			bundle.send(g_kbengine);
		}
	}
	
	this.bind_email = function(mailstr)
	{  
		var bundle = new KBEngine.Bundle();
		bundle.newMessage(KBEngine.messages.Baseapp_reqAccountBindEmail);
		bundle.writeInt32(g_kbengine.entity_id);
		bundle.writeString(g_kbengine.password);
		bundle.writeString(mailstr);
		bundle.send(g_kbengine);
	}
	
	this.new_password = function(oldpassword, newpassword)
	{
		var bundle = new KBEngine.Bundle();
		bundle.newMessage(KBEngine.messages.Baseapp_reqAccountNewPassword);
		bundle.writeInt32(g_kbengine.entity_id);
		bundle.writeString(oldpassword);
		bundle.writeString(newpassword);
		bundle.send(g_kbengine);
	}
	
	this.login = function(username, password)
	{  
		g_kbengine.username = username;
		g_kbengine.password = password;
		
		g_kbengine.login_loginapp(true);
	}
	
	this.login_loginapp = function(noconnect)
	{  
		if(noconnect)
		{
			console.info("KBENGINE::login_loginapp: start connect to ws://" + g_kbengine.ip + ":" + g_kbengine.port + "!");
			g_kbengine.connect("ws://" + g_kbengine.ip + ":" + g_kbengine.port);
			g_kbengine.socket.onopen = g_kbengine.onOpenLoginapp_login;  
		}
		else
		{
			var bundle = new KBEngine.Bundle();
			bundle.newMessage(KBEngine.messages.Loginapp_login);
			bundle.writeInt8(3); // clientType
			bundle.writeBlob("");
			bundle.writeString(g_kbengine.username);
			bundle.writeString(g_kbengine.password);
			bundle.send(g_kbengine);
		}
	}

	this.onOpenLoginapp_resetpassword = function()
	{  
		console.info("KBENGINE::onOpenLoginapp_resetpassword: successfully!");
		g_kbengine.currserver = "loginapp";
		g_kbengine.currstate = "resetpassword";
		
		if(!g_kbengine.loginappMessageImported)
		{
			var bundle = new KBEngine.Bundle();
			bundle.newMessage(KBEngine.messages.Loginapp_importClientMessages);
			bundle.send(g_kbengine);
			g_kbengine.socket.onmessage = g_kbengine.Client_onImportClientMessages;  
			console.info("KBENGINE::onOpenLoginapp_resetpassword: start importClientMessages ...");
		}
		else
		{
			g_kbengine.onImportClientMessagesCompleted();
		}
	}

	this.reset_password = function(username)
	{ 
		g_kbengine.username = username;
		g_kbengine.resetpassword_loginapp(true);
	}
	
	this.resetpassword_loginapp = function(noconnect)
	{  
		if(noconnect)
		{
			console.info("KBENGINE::createAccount_loginapp: start connect to ws://" + g_kbengine.ip + ":" + g_kbengine.port + "!");
			g_kbengine.connect("ws://" + g_kbengine.ip + ":" + g_kbengine.port);
			g_kbengine.socket.onopen = g_kbengine.onOpenLoginapp_resetpassword;  
		}
		else
		{
			var bundle = new KBEngine.Bundle();
			bundle.newMessage(KBEngine.messages.Loginapp_reqAccountResetPassword);
			bundle.writeString(g_kbengine.username);
			bundle.send(g_kbengine);
		}
	}
	
	this.onOpenBaseapp = function()
	{
		console.info("KBENGINE::onOpenBaseapp: successfully!");
		g_kbengine.currserver = "baseapp";
		
		if(!g_kbengine.baseappMessageImported)
		{
			var bundle = new KBEngine.Bundle();
			bundle.newMessage(KBEngine.messages.Baseapp_importClientMessages);
			bundle.send(g_kbengine);
			g_kbengine.socket.onmessage = g_kbengine.Client_onImportClientMessages;  
		}
		else
		{
			g_kbengine.onImportClientMessagesCompleted();
		}
	}
	
	this.login_baseapp = function(noconnect)
	{  
		if(noconnect)
		{
			console.info("KBENGINE::login_baseapp: start connect to ws://" + g_kbengine.ip + ":" + g_kbengine.port + "!");
			g_kbengine.connect("ws://" + g_kbengine.ip + ":" + g_kbengine.port);
			g_kbengine.socket.onopen = g_kbengine.onOpenBaseapp;  
		}
		else
		{
			var bundle = new KBEngine.Bundle();
			bundle.newMessage(KBEngine.messages.Baseapp_loginGateway);
			bundle.writeString(g_kbengine.username);
			bundle.writeString(g_kbengine.password);
			bundle.send(g_kbengine);
		}
	}
	
	this.relogin_baseapp = function()
	{  
		console.info("KBENGINE::relogin_baseapp: start connect to ws://" + g_kbengine.ip + ":" + g_kbengine.port + "!");
		g_kbengine.connect("ws://" + g_kbengine.ip + ":" + g_kbengine.port);
		g_kbengine.socket.onopen = g_kbengine.onReOpenBaseapp;  
	}
	
	this.onReOpenBaseapp = function()
	{
		console.info("KBENGINE::onReOpenBaseapp: successfully!");
		g_kbengine.currserver = "baseapp";
		
		var bundle = new KBEngine.Bundle();
		bundle.newMessage(KBEngine.messages.Baseapp_reLoginGateway);
		bundle.writeString(g_kbengine.username);
		bundle.writeString(g_kbengine.password);
		bundle.writeUint64(g_kbengine.entity_uuid);
		bundle.writeInt32(g_kbengine.entity_id);
		bundle.send(g_kbengine);
	}
	
	this.Client_onHelloCB = function(args)
	{
		g_kbengine.serverVersion = args.readString();
		g_kbengine.serverScriptVersion = args.readString();
		g_kbengine.serverProtocolMD5 = args.readString();
		g_kbengine.serverEntityDefMD5 = args.readString();
		
		var ctype = args.readInt32();
		
		console.info("KBENGINE::Client_onHelloCB: verInfo(" + g_kbengine.serverVersion + "), scriptVerInfo(" + 
			g_kbengine.serverScriptVersion + "), serverProtocolMD5(" + g_kbengine.serverProtocolMD5 + "), serverEntityDefMD5(" + 
			g_kbengine.serverEntityDefMD5 + "), ctype(" + ctype + ")!");
	}
	
	this.Client_onLoginFailed = function(args)
	{
		var failedcode = args.readUint16();
		g_kbengine.serverdatas = args.readBlob();
		console.error("KBENGINE::Client_onLoginFailed: failedcode(" + failedcode + "), datas(" + g_kbengine.serverdatas.length + ")!");
	}
	
	this.Client_onLoginSuccessfully = function(args)
	{
		var accountName = args.readString();
		g_kbengine.username = accountName;
		g_kbengine.ip = args.readString();
		g_kbengine.port = args.readUint16();
		g_kbengine.serverdatas = args.readBlob();
		
		console.info("KBENGINE::Client_onLoginSuccessfully: accountName(" + accountName + "), addr(" + 
				g_kbengine.ip + ":" + g_kbengine.port + "), datas(" + g_kbengine.serverdatas.length + ")!");
		
		g_kbengine.login_baseapp(true);
	}
	
	this.Client_onLoginGatewayFailed = function(failedcode)
	{
		console.error("KBENGINE::Client_onLoginGatewayFailed: failedcode(" + failedcode + ")!");
	}

	this.Client_onReLoginGatewaySuccessfully = function(stream)
	{
		g_kbengine.entity_uuid = stream.readUint64();
		console.error("KBENGINE::Client_onReLoginGatewaySuccessfully: " + g_kbengine.username);
	}
	
	this.entityclass = {};
	this.getentityclass = function(entityType)
	{
		var runclass = g_kbengine.entityclass[entityType];
		if(runclass == undefined)
		{
			runclass = eval("KBEngine." + entityType);
			if(runclass == undefined)
			{
				console.error("KBENGINE::getentityclass: entityType(" + entityType + ") is error!");
				return runclass;
			}
			else
				g_kbengine.entityclass[entityType] = runclass;
		}

		return runclass;
	}
	
	this.Client_onCreatedProxies = function(rndUUID, eid, entityType)
	{
		console.info("KBENGINE::Client_onCreatedProxies: eid(" + eid + "), entityType(" + entityType + ")!");
		
		var entity = g_kbengine.entities[eid];
		
		if(entity != undefined)
		{
			console.warn("KBENGINE::Client_onCreatedProxies: entity(" + eid + ") has exist!");
			return;
		}
		
		g_kbengine.entity_uuid = rndUUID;
		g_kbengine.entity_id = eid;
		
		var runclass = g_kbengine.getentityclass(entityType);
		if(runclass == undefined)
			return;
		
		var entity = new runclass();
		entity.id = eid;
		entity.className = entityType;
		
		entity.base = new KBEngine.Mailbox();
		entity.base.id = eid;
		entity.base.className = entityType;
		entity.base.type = KBEngine.MAILBOX_TYPE_BASE;
		
		g_kbengine.entities[eid] = entity;
		
		entity.onInit();
	}
	
	this.getAoiEntityIDFromStream = function(stream)
	{
		var id = 0;
		if(g_kbengine.entityIDAliasIDList.Length > 255)
		{
			id = stream.readInt32();
		}
		else
		{
			id = g_kbengine.entityIDAliasIDList[stream.readUint8()];
		}
		
		// ���Ϊ0�ҿͻ�����һ�����ص�½���������������ҷ����entity�ڶ����ڼ�һֱ��������״̬
		// ����Ժ����������, ��Ϊcellapp����һֱ����baseapp����ͬ����Ϣ�� ���ͻ���������ʱδ��
		// ����˳�ʼ�����迪ʼ���յ�ͬ����Ϣ, ��ʱ����ͻ����
		if(g_kbengine.entityIDAliasIDList.length == 0)
			return 0;
		
		return id;
	}
	
	this.onUpdatePropertys_ = function(eid, stream)
	{
		var entity = g_kbengine.entities[eid];
		
		if(entity == undefined)
		{
			entityMessage = KBEngine.bufferedCreateEntityMessage[eid];
			if(entityMessage != undefined)
			{
				console.error("KBENGINE::Client_onUpdatePropertys: entity(" + eid + ") not found!");
				return;
			}
			
			var stream1 = new KBEngine.MemoryStream(stream.buffer);
			stream1.wpos = stream.wpos;
			stream1.rpos = stream.rpos - 4;
			KBEngine.bufferedCreateEntityMessage[eid] = stream1;
			return;
		}
		
		var currModule = KBEngine.moduledefs[entity.className];
		var pdatas = currModule.propertys;
		while(stream.length() > 0)
		{
			var utype = 0;
			if(currModule.usePropertyDescrAlias)
				utype = stream.readUint8();
			else
				utype = stream.readUint16();
		
			var propertydata = pdatas[utype];
			var setmethod = propertydata[5];
			var val = propertydata[4].createFromStream(stream);
			var oldval = entity[utype];
			console.info("KBENGINE::Client_onUpdatePropertys: " + entity.className + "(id=" + eid  + " " + propertydata[2] + ", val=" + val + ")!");
			entity[propertydata[2]] = val;
			if(setmethod != null)
			{
				setmethod.apply(entity, oldval);
			}
		}
	}

	this.Client_onUpdatePropertysOptimized = function(stream)
	{
		var eid = g_kbengine.getAoiEntityIDFromStream(stream);
		g_kbengine.onUpdatePropertys_(eid, stream);
	}
	
	this.Client_onUpdatePropertys = function(stream)
	{
		var eid = stream.readInt32();
		g_kbengine.onUpdatePropertys_(eid, stream);
	}

	this.onRemoteMethodCall_ = function(eid, stream)
	{
		var entity = g_kbengine.entities[eid];
		
		if(entity == undefined)
		{
			console.error("KBENGINE::Client_onRemoteMethodCall: entity(" + eid + ") not found!");
			return;
		}
		
		var methodUtype = 0;
		if(KBEngine.moduledefs[entity.className].useMethodDescrAlias)
			methodUtype = stream.readUint8();
		else
			methodUtype = stream.readUint16();
		
		var methoddata = KBEngine.moduledefs[entity.className].methods[methodUtype];
		var args = [];
		var argsdata = methoddata[3];
		for(var i=0; i<argsdata.length; i++)
		{
			args.push(argsdata[i].createFromStream(stream));
		}
		
		if(entity[methoddata[2]] != undefined)
		{
			entity[methoddata[2]].apply(entity, args);
		}
		else
		{
			console.error("KBENGINE::Client_onRemoteMethodCall: entity(" + eid + ") not found method(" + methoddata[2] + ")!");
		}
	}
	
	this.Client_onRemoteMethodCallOptimized = function(stream)
	{
		var eid = g_kbengine.getAoiEntityIDFromStream(stream);
		g_kbengine.onRemoteMethodCall_(eid, stream);
	}
	
	this.Client_onRemoteMethodCall = function(stream)
	{
		var eid = stream.readInt32();
		g_kbengine.onRemoteMethodCall_(eid, stream);
	}
	
	this.Client_onEntityEnterWorld = function(stream)
	{
		var eid = stream.readInt32();
		if(g_kbengine.entity_id > 0 && eid != g_kbengine.entity_id)
			g_kbengine.entityIDAliasIDList.push(eid)
		
		var entityType;
		if(KBEngine.moduledefs.Length > 255)
			entityType = stream.readUint16();
		else
			entityType = stream.readUint8();
		
		var isOnGound = true;
		
		if(stream.length() > 0)
			isOnGound = stream.readInt8();
		
		entityType = KBEngine.moduledefs[entityType].name;
		console.info("KBENGINE::Client_onEntityEnterWorld: " + entityType + "(" + eid + "), spaceID(" + g_kbengine.spaceID + "), isOnGound(" + isOnGound + ")!");
		
		var entity = g_kbengine.entities[eid];
		if(entity == undefined)
		{
			entityMessage = KBEngine.bufferedCreateEntityMessage[eid];
			if(entityMessage == undefined)
			{
				console.error("KBENGINE::Client_onEntityEnterWorld: entity(" + eid + ") not found!");
				return;
			}
			
			var runclass = g_kbengine.getentityclass(entityType);
			if(runclass == undefined)
				return;
			
			var entity = new runclass();
			entity.id = eid;
			entity.className = entityType;
			
			entity.cell = new KBEngine.Mailbox();
			entity.cell.id = eid;
			entity.cell.className = entityType;
			entity.cell.type = KBEngine.MAILBOX_TYPE_CELL;
			
			g_kbengine.entities[eid] = entity;
			
			g_kbengine.Client_onUpdatePropertys(entityMessage);
			delete KBEngine.bufferedCreateEntityMessage[eid];
			
			entity.onInit();
			entity.onEnterWorld();
		}
		else
		{
			if(!entity.inWorld)
			{
				// ��ȫ����� �������һ��
				// ����������ʹ��giveClientTo�л�����Ȩ
				// ֮ǰ��ʵ���Ѿ��������磬 �л����ʵ��Ҳ�������磬 ������ܻ����֮ǰ�Ǹ�ʵ������������Ϣ
				g_kbengine.entityIDAliasIDList = [];
				g_kbengine.entities = {}
				g_kbengine.entities[entity.id] = entity;
			
				entity.onEnterWorld();
			}
		}
	}

	this.Client_onEntityLeaveWorldOptimized = function(stream)
	{
		var eid = g_kbengine.getAoiEntityIDFromStream(stream);
		g_kbengine.Client_onEntityLeaveWorld(eid);
	}
	
	this.Client_onEntityLeaveWorld = function(eid)
	{
		var entity = g_kbengine.entities[eid];
		if(entity == undefined)
		{
			console.error("KBENGINE::Client_onEntityLeaveWorld: entity(" + eid + ") not found!");
			return;
		}
		
		if(entity.inWorld)
			entity.onLeaveWorld();
		
		if(g_kbengine.entity_id > 0 && eid != g_kbengine.entity_id)
		{
			delete g_kbengine.entities[eid];
			
			var newArray = [];
			for(var i=0; i<g_kbengine.entityIDAliasIDList.length; i++){
			    if(g_kbengine.entityIDAliasIDList[i] != eid){
			       newArray.push(g_kbengine.entityIDAliasIDList[i]);
			     }
			}
			
			g_kbengine.entityIDAliasIDList = newArray
		}
		else
		{
			g_kbengine.clearSpace(false);
			entity.cell = null;
		}
	}

	this.Client_onEntityDestroyed = function(eid)
	{
		console.info("KBENGINE::Client_onEntityDestroyed: entity(" + eid + ")!");
		
		var entity = g_kbengine.entities[eid];
		if(entity == undefined)
		{
			console.error("KBENGINE::Client_onEntityDestroyed: entity(" + eid + ") not found!");
			return;
		}

		if(entity.inWorld)
			entity.onLeaveWorld();
		
		delete g_kbengine.entities[eid];
	}
	
	this.Client_onEntityEnterSpace = function(stream)
	{
		var eid = stream.readInt32();
		var isOnGound = true;
		
		if(stream.length() > 0)
			isOnGound = stream.readInt8();
		
		var entity = g_kbengine.entities[eid];
		if(entity == undefined)
		{
			console.error("KBENGINE::Client_onEntityEnterSpace: entity(" + eid + ") not found!");
			return;
		}
		
		entity.onEnterSpace();
	}
	
	this.Client_onEntityLeaveSpace = function(eid)
	{
		var entity = g_kbengine.entities[eid];
		if(entity == undefined)
		{
			console.error("KBENGINE::Client_onEntityLeaveSpace: entity(" + eid + ") not found!");
			return;
		}
		
		g_kbengine.clearSpace(false);
		entity.onLeaveSpace();
	}

	this.Client_onKicked = function(failedcode)
	{
		console.error("KBENGINE::Client_onKicked: failedcode(" + failedcode + ")!");
	}
	
	this.Client_onSetEntityPosAndDir = function(stream)
	{
		var eid = stream.readInt32();
		var entity = g_kbengine.entities[eid];
		if(entity == undefined)
		{
			console.error("KBENGINE::Client_onSetEntityPosAndDir: entity(" + eid + ") not found!");
			return;
		}
		
		entity.position[0] = stream.readFloat();
		entity.position[1] = stream.readFloat();
		entity.position[2] = stream.readFloat();
		
		entity.direction[0] = stream.readFloat();
		entity.direction[1] = stream.readFloat();
		entity.direction[2] = stream.readFloat();
	}

	this.Client_onCreateAccountResult = function(stream)
	{
		var retcode = stream.readUint16();
		var datas = stream.readBlob();
		
		if(retcode != 0)
		{
			console.error("KBENGINE::Client_onCreateAccountResult: " + g_kbengine.username + " create is failed! code=" + retcode + "!");
			return;
		}

		console.info("KBENGINE::Client_onCreateAccountResult: " + g_kbengine.username + " create is successfully!");
	}
	
	this.updatePlayerToServer = function()
	{
		player = g_kbengine.player();
		if(player == undefined || player.inWorld == false || g_kbengine.spaceID == 0)
			return;
		
		var bundle = new KBEngine.Bundle();
		bundle.newMessage(KBEngine.messages.Baseapp_onUpdateDataFromClient);
		bundle.writeFloat(player.position[0]);
		bundle.writeFloat(player.position[1]);
		bundle.writeFloat(player.position[2]);
		bundle.writeFloat(player.direction[2]);
		bundle.writeFloat(player.direction[1]);
		bundle.writeFloat(player.direction[0]);
		bundle.writeUint8(g_kbengine.isOnGound);
		bundle.writeUint8(g_kbengine.spaceID);
		bundle.send(g_kbengine);
	}
	
	this.addSpaceGeometryMapping = function(spaceID, respath)
	{
		console.info("KBENGINE::addSpaceGeometryMapping: spaceID(" + spaceID + "), respath(" + respath + ")!");
		
		g_kbengine.spaceID = spaceID;
		g_kbengine.spaceResPath = respath;
	}

	this.clearSpace = function(isAll)
	{
		g_kbengine.entityIDAliasIDList = [];
		g_kbengine.spacedata = {};
		g_kbengine.isLoadedGeometry = false;
		g_kbengine.spaceID = 0;
		
		if(!isAll)
		{
			var entity = g_kbengine.player();
			
			for (var eid in g_kbengine.entities)  
			{ 
				if(eid == entity.id)
					continue;
				
			    g_kbengine.entities[eid].onLeaveWorld();
			}  
				
			g_kbengine.entities = {}
			g_kbengine.entities[entity.id] = entity;
		}
		else
		{
			for (var eid in g_kbengine.entities)  
			{ 
			    g_kbengine.entities[eid].onLeaveWorld();
			}  
				
			g_kbengine.entities = {}
		}
	}
		
	this.Client_initSpaceData = function(stream)
	{
		g_kbengine.clearSpace(false);
		
		g_kbengine.spaceID = stream.readInt32();
		while(stream.length() > 0)
		{
			var key = stream.readString();
			var value = stream.readString();
			g_kbengine.Client_setSpaceData(g_kbengine.spaceID, key, value);
		}
		
		console.info("KBENGINE::Client_initSpaceData: spaceID(" + g_kbengine.spaceID + "), datas(" + g_kbengine.spacedata + ")!");
	}
	
	this.Client_setSpaceData = function(spaceID, key, value)
	{
		console.info("KBENGINE::Client_setSpaceData: spaceID(" + spaceID + "), key(" + key + "), value(" + value + ")!");
		
		g_kbengine.spacedata[key] = value;
		
		if(key == "_mapping")
			g_kbengine.addSpaceGeometryMapping(spaceID, value);
	}
	
	this.Client_delSpaceData = function(spaceID, key)
	{
		console.info("KBENGINE::Client_delSpaceData: spaceID(" + spaceID + "), key(" + key + ")!");
		
		delete g_kbengine.spacedata[key];
	}
	
	this.Client_getSpaceData = function(spaceID, key)
	{
		return g_kbengine.spacedata[key];
	}
	
	this.Client_onUpdateBasePos = function(stream)
	{
		var pos = Array(3);
		pos[0] = stream.readFloat();
		pos[1] = stream.readFloat();
		pos[2] = stream.readFloat();
	}
	
	this.Client_onUpdateBasePosXZ = function(stream)
	{
		var pos = Array(3);
		pos[0] = stream.readFloat();
		pos[2] = stream.readFloat();
	}
	
	this.Client_onUpdateData = function(stream)
	{
		var eid = g_kbengine.getAoiEntityIDFromStream(stream);
		var entity = g_kbengine.entities[eid];
		if(entity == undefined)
		{
			console.error("KBENGINE::Client_onUpdateData: entity(" + eid + ") not found!");
			return;
		}
	}
	
	this.Client_onUpdateData_ypr = function(stream)
	{
		var eid = g_kbengine.getAoiEntityIDFromStream(stream);
		
		var y = stream.readInt8();
		var p = stream.readInt8();
		var r = stream.readInt8();
		
		g_kbengine._updateVolatileData(eid, 0.0, 0.0, 0.0, y, p, r);
	}
	
	this.Client_onUpdateData_yp = function(stream)
	{
		var eid = g_kbengine.getAoiEntityIDFromStream(stream);
		
		var y = stream.readInt8();
		var p = stream.readInt8();
		
		g_kbengine._updateVolatileData(eid, 0.0, 0.0, 0.0, y, p, KBEngine.KBE_FLT_MAX);
	}
	
	this.Client_onUpdateData_yr = function(stream)
	{
		var eid = g_kbengine.getAoiEntityIDFromStream(stream);
		
		var y = stream.readInt8();
		var r = stream.readInt8();
		
		g_kbengine._updateVolatileData(eid, 0.0, 0.0, 0.0, y, KBEngine.KBE_FLT_MAX, r);
	}
	
	this.Client_onUpdateData_pr = function(stream)
	{
		var eid = g_kbengine.getAoiEntityIDFromStream(stream);
		
		var p = stream.readInt8();
		var r = stream.readInt8();
		
		g_kbengine._updateVolatileData(eid, 0.0, 0.0, 0.0, KBEngine.KBE_FLT_MAX, p, r);
	}
	
	this.Client_onUpdateData_y = function(stream)
	{
		var eid = g_kbengine.getAoiEntityIDFromStream(stream);
		
		var y = stream.readPackY();
		
		g_kbengine._updateVolatileData(eid, 0.0, 0.0, 0.0, y, KBEngine.KBE_FLT_MAX, KBEngine.KBE_FLT_MAX);
	}
	
	this.Client_onUpdateData_p = function(stream)
	{
		var eid = g_kbengine.getAoiEntityIDFromStream(stream);
		
		var p = stream.readInt8();
		
		g_kbengine._updateVolatileData(eid, 0.0, 0.0, 0.0, KBEngine.KBE_FLT_MAX, p, KBEngine.KBE_FLT_MAX);
	}
	
	this.Client_onUpdateData_r = function(stream)
	{
		var eid = g_kbengine.getAoiEntityIDFromStream(stream);
		
		var r = stream.readInt8();
		
		g_kbengine._updateVolatileData(eid, 0.0, 0.0, 0.0, KBEngine.KBE_FLT_MAX, KBEngine.KBE_FLT_MAX, r);
	}
	
	this.Client_onUpdateData_xz = function(stream)
	{
		var eid = g_kbengine.getAoiEntityIDFromStream(stream);
		
		var xz = stream.readPackXZ();
		
		g_kbengine._updateVolatileData(eid, xz[0], 0.0, xz[1], KBEngine.KBE_FLT_MAX, KBEngine.KBE_FLT_MAX, KBEngine.KBE_FLT_MAX);
	}
	
	this.Client_onUpdateData_xz_ypr = function(stream)
	{
		var eid = g_kbengine.getAoiEntityIDFromStream(stream);
		
		var xz = stream.readPackXZ();

		var y = stream.readInt8();
		var p = stream.readInt8();
		var r = stream.readInt8();
		
		g_kbengine._updateVolatileData(eid, xz[0], 0.0, xz[1], y, p, r);
	}
	
	this.Client_onUpdateData_xz_yp = function(stream)
	{
		var eid = g_kbengine.getAoiEntityIDFromStream(stream);
		
		var xz = stream.readPackXZ();

		var y = stream.readInt8();
		var p = stream.readInt8();
		
		g_kbengine._updateVolatileData(eid, xz[0], 0.0, xz[1], y, p, KBEngine.KBE_FLT_MAX);
	}
	
	this.Client_onUpdateData_xz_yr = function(stream)
	{
		var eid = g_kbengine.getAoiEntityIDFromStream(stream);
		
		var xz = stream.readPackXZ();

		var y = stream.readInt8();
		var r = stream.readInt8();
		
		g_kbengine._updateVolatileData(eid, xz[0], 0.0, xz[1], y, KBEngine.KBE_FLT_MAX, r);
	}
	
	this.Client_onUpdateData_xz_pr = function(stream)
	{
		var eid = g_kbengine.getAoiEntityIDFromStream(stream);
		
		var xz = stream.readPackXZ();

		var p = stream.readInt8();
		var r = stream.readInt8();
		
		g_kbengine._updateVolatileData(eid, xz[0], 0.0, xz[1], KBEngine.KBE_FLT_MAX, p, r);
	}
	
	this.Client_onUpdateData_xz_y = function(stream)
	{
		var eid = g_kbengine.getAoiEntityIDFromStream(stream);
		
		var xz = stream.readPackXZ();

		var y = stream.readInt8();
		
		g_kbengine._updateVolatileData(eid, xz[0], 0.0, xz[1], y, KBEngine.KBE_FLT_MAX, KBEngine.KBE_FLT_MAX);
	}
	
	this.Client_onUpdateData_xz_p = function(stream)
	{
		var eid = g_kbengine.getAoiEntityIDFromStream(stream);
		
		var xz = stream.readPackXZ();

		var p = stream.readInt8();
		
		g_kbengine._updateVolatileData(eid, xz[0], 0.0, xz[1], KBEngine.KBE_FLT_MAX, p, KBEngine.KBE_FLT_MAX);
	}
	
	this.Client_onUpdateData_xz_r = function(stream)
	{
		var eid = g_kbengine.getAoiEntityIDFromStream(stream);
		
		var xz = stream.readPackXZ();

		var r = stream.readInt8();
		
		g_kbengine._updateVolatileData(eid, xz[0], 0.0, xz[1], KBEngine.KBE_FLT_MAX, KBEngine.KBE_FLT_MAX, r);
	}
	
	this.Client_onUpdateData_xyz = function(stream)
	{
		var eid = g_kbengine.getAoiEntityIDFromStream(stream);
		
		var xz = stream.readPackXZ();
		var y = stream.readPackY();
		
		g_kbengine._updateVolatileData(eid, xz[0], y, xz[1], KBEngine.KBE_FLT_MAX, KBEngine.KBE_FLT_MAX, KBEngine.KBE_FLT_MAX);
	}
	
	this.Client_onUpdateData_xyz_ypr = function(stream)
	{
		var eid = g_kbengine.getAoiEntityIDFromStream(stream);
		
		var xz = stream.readPackXZ();
		var y = stream.readPackY();
		
		var yaw = stream.readInt8();
		var p = stream.readInt8();
		var r = stream.readInt8();
		
		g_kbengine._updateVolatileData(eid, xz[0], y, xz[1], yaw, p, r);
	}
	
	this.Client_onUpdateData_xyz_yp = function(stream)
	{
		var eid = g_kbengine.getAoiEntityIDFromStream(stream);
		
		var xz = stream.readPackXZ();
		var y = stream.readPackY();
		
		var yaw = stream.readInt8();
		var p = stream.readInt8();
		
		g_kbengine._updateVolatileData(eid, xz[0], y, xz[1], yaw, p, KBEngine.KBE_FLT_MAX);
	}
	
	this.Client_onUpdateData_xyz_yr = function(stream)
	{
		var eid = g_kbengine.getAoiEntityIDFromStream(stream);
		
		var xz = stream.readPackXZ();
		var y = stream.readPackY();
		
		var yaw = stream.readInt8();
		var r = stream.readInt8();
		
		g_kbengine._updateVolatileData(eid, xz[0], y, xz[1], yaw, KBEngine.KBE_FLT_MAX, r);
	}
	
	this.Client_onUpdateData_xyz_pr = function(stream)
	{
		var eid = g_kbengine.getAoiEntityIDFromStream(stream);
		
		var xz = stream.readPackXZ();
		var y = stream.readPackY();
		
		var p = stream.readInt8();
		var r = stream.readInt8();
		
		g_kbengine._updateVolatileData(eid, x, y, z, KBEngine.KBE_FLT_MAX, p, r);
	}
	
	this.Client_onUpdateData_xyz_y = function(stream)
	{
		var eid = g_kbengine.getAoiEntityIDFromStream(stream);
		
		var xz = stream.readPackXZ();
		var y = stream.readPackY();
		
		var yaw = stream.readInt8();
		
		g_kbengine._updateVolatileData(eid, xz[0], y, xz[1], yaw, KBEngine.KBE_FLT_MAX, KBEngine.KBE_FLT_MAX);
	}
	
	this.Client_onUpdateData_xyz_p = function(stream)
	{
		var eid = g_kbengine.getAoiEntityIDFromStream(stream);
		
		var xz = stream.readPackXZ();
		var y = stream.readPackY();
		
		var p = stream.readInt8();
		
		g_kbengine._updateVolatileData(eid, xz[0], y, xz[1], KBEngine.KBE_FLT_MAX, p, KBEngine.KBE_FLT_MAX);
	}
	
	this.Client_onUpdateData_xyz_r = function(stream)
	{
		var eid = g_kbengine.getAoiEntityIDFromStream(stream);
		
		var xz = stream.readPackXZ();
		var y = stream.readPackY();
		
		var p = stream.readInt8();
		
		g_kbengine._updateVolatileData(eid, xz[0], y, xz[1], r, KBEngine.KBE_FLT_MAX, KBEngine.KBE_FLT_MAX);
	}
	
	this._updateVolatileData = function(entityID, x, y, z, yaw, pitch, roll)
	{
		if(entityID == 0)
		{
			// ���Ϊ0�ҿͻ�����һ�����ص�½���������������ҷ����entity�ڶ����ڼ�һֱ��������״̬
			// ����Ժ����������, ��Ϊcellapp����һֱ����baseapp����ͬ����Ϣ�� ���ͻ���������ʱδ��
			// ����˳�ʼ�����迪ʼ���յ�ͬ����Ϣ, ��ʱ����ͻ����
			return;
		}
	}
	
	this.Client_onStreamDataStarted = function(id, datasize, descr)
	{
	}
	
	this.Client_onStreamDataRecv = function(stream)
	{
	}
	
	this.Client_onStreamDataCompleted = function(id)
	{
	}
	
	this.Client_onReqAccountResetPasswordCB = function(failcode)
	{
		if(failcode != 0)
		{
			console.error("KBENGINE::Client_onReqAccountResetPasswordCB: " + g_kbengine.username + " is failed! code=" + failcode + "!");
			return;
		}

		console.info("KBENGINE::Client_onReqAccountResetPasswordCB: " + g_kbengine.username + " is successfully!");
	}
	
	this.Client_onReqAccountBindEmailCB = function(failcode)
	{
		if(failcode != 0)
		{
			console.error("KBENGINE::Client_onReqAccountBindEmailCB: " + g_kbengine.username + " is failed! code=" + failcode + "!");
			return;
		}

		console.info("KBENGINE::Client_onReqAccountBindEmailCB: " + g_kbengine.username + " is successfully!");
	}
	
	this.Client_onReqAccountNewPasswordCB = function(failcode)
	{
		if(failcode != 0)
		{
			console.error("KBENGINE::Client_onReqAccountNewPasswordCB: " + g_kbengine.username + " is failed! code=" + failcode + "!");
			return;
		}

		console.info("KBENGINE::Client_onReqAccountNewPasswordCB: " + g_kbengine.username + " is successfully!");
	}
}

var g_kbengine = new KBEngine.KBEngineApp();
setInterval(g_kbengine.update, 100);
