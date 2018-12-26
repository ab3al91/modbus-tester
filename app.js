const express = require('express')
const expressws = require('express-ws');
const ModbusRTU = require("modbus-serial");
var bodyParser = require('body-parser')
const app = express()
let ws = expressws(app);
var port = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(bodyParser.json())

app.ws('/', function(ws, req) {
  console.log('!!!!!!!!socket connected');
});

var wss = ws.getWss('/');

var brodcast = (d)=>{
  wss.clients.forEach(function (wclient) {
    // console.log('Brodcast',msg);
        var json = {};
        json['0'] = d;
        json['isOpen'] = client.isOpen;
        data = d;
        wclient.send(JSON.stringify(json));
 
  });
}



var data = [];
//var writeG = 0;


app.disable('etag');

app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Pass to next layer of middleware
    next();
});





// create an empty modbus client
var interval;
var clientParam={
	ip:"87.255.213.153",
	port:5002,
	startReg:0,
	lastReg:0,
	type:1,
	parity:0,
	baudRate:0,
	slaveId:0
};
var client = new ModbusRTU();
// set timeout, if slave did not reply back
client.setTimeout(10000);

// client.connectTCP("87.255.213.153", { port: 5002 }, ()=> {
// 	// start get value
// 	console.log('modbus connected ' + client.isOpen);
// 	//if(client.isOpen) getSlavesValue(slavesIdList);
// 	if(client.isOpen) {
// 		setInterval(function() {
// 			client.readHoldingRegisters(0, 5, function(err, data) {
// 			console.log(data.data);
// 			});
// 		}, 4000);
// 	}
// });

app.post('/toggle', function (req, res) {


	// open connection to a serial port
	//client.connectRTU("/dev/ttyUSB0", { baudRate: 19200 }, ()=> {
	/*client.connectRTUBuffered("/dev/ttyUSB0", { baudRate: 19200 }, ()=> {
		// start get value
		console.log('modbus connected ' + client.isOpen);
		if(client.isOpen) getSlavesValue(slavesIdList);
	});*/
	clientParam = req.body

	console.log('toggle ',clientParam);

	res.setHeader('Content-Type', 'application/json');

	if(client && client.isOpen){
		client.close();
		clearInterval(interval);
		res.send(JSON.stringify({isOpen:false}));
	}
	else{
		
		client.connectTCP(clientParam.ip, { port: Number(clientParam.port) }).then(()=> {
			// start get value
			console.log('modbusTCP connected ' + client.isOpen,clientParam);
			//if(client.isOpen) getSlavesValue(slavesIdList);
			if(client.isOpen) {
				readVals(client);
				interval = setInterval(readVals, 5000);
			}

			res.send(JSON.stringify({isOpen:client.isOpen}));
		}).catch(function(e) {
	        console.log(e.message);
	        res.send(JSON.stringify({isOpen:client.isOpen,error:e.message}));
	    });
	}
})

function readVals() {

	// console.log(client.isOpen,clientParam);

	if(client.isOpen){
		client.readHoldingRegisters(Number(clientParam.startReg), Number(clientParam.lastReg)).then((d)=>{
			console.log(d.data);
			brodcast(d.data);
		}).catch((err)=>{
			console.log(err);
		});
	}
 }



app.get('*', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(data));
})



//const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));


//const log = (txt) => process.stdout.write('\n'+txt);

// const clear = (txt) => {
//     process.stdout.moveCursor(0, -6);
//     process.stdout.cursorTo(0);
//     process.stdout.clearScreenDown();
// }

// const tim = ()=>{
//     return (new Date().getTime() - start) + 'ms';
// }

app.listen(port, () => console.log(`
           __         __ ___       __      __ 
/  \\\\_/|  (_ |\\/| /\\ |__) |   |__|/  \\|\\/||_  
\\__/ | |  __)|  |/--\\| \\  |   |  |\\__/|  ||__ 
                                              
`));
