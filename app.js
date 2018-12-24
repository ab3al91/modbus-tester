const express = require('express')
const expressws = require('express-ws');
const ModbusRTU = require("modbus-serial");
const app = express()
let ws = expressws(app);
const port = 80

app.use(express.static('public'));

app.ws('/', function(ws, req) {
  console.log('!!!!!!!!socket connected');
});

var wss = ws.getWss('/');

var brodcast = (slave)=>{
  wss.clients.forEach(function (client) {
    // console.log('Brodcast',msg);
    if(slave){
        var json = {};
        json[slave] = data[slave];
        client.send(JSON.stringify(json));
    }
    else
        client.send(JSON.stringify(data));
  });
}



var data = {"1":[],"2":[], "3":[],"4":[],"5":[],"6":[]};
var queue = [];
//var writeG = 0;

var slaveG;
var regG;
var valueG;


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


app.get('/write/:slave/:reg/:value', (req, res, next) => {
    slaveG = Number(req.params.slave);
    regG = Number(req.params.reg);
    valueG = Number(req.params.value);

    console.log('push',slaveG,regG,valueG)

    queue.push([slaveG,regG,valueG,next]);
    
    
    // next();
})

app.get('*', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(data));
})


// create an empty modbus client
const client = new ModbusRTU();
// open connection to a serial port
//client.connectRTU("/dev/ttyUSB0", { baudRate: 19200 }, ()=> {
client.connectRTUBuffered("/dev/ttyUSB0", { baudRate: 19200 }, ()=> {

	// start get value
	console.log('modbus connected ' + client.isOpen);
	getSlavesValue(slavesIdList);
});
// set timeout, if slave did not reply back
client.setTimeout(1000);

// list of meter's id
const slaveRegLength = [19, 7, 5, 4, 4, 7];
const slavesIdList = [1, 2, 3, 4, 5, 6];

var start = 0;

const getSlavesValue = async (slaves) => {
    try{
        // get value of all meters
        for(let slave of slaves) {

            start = new Date().getTime();

            while((a=queue.pop()) != null){
                //await sleep(50);
                await setSlaveValue(a[0], a[1], a[2]);
                console.log('>>>>>>>>',a,tim());
                // await sleep(50);
                // await getSlaveValue(a[0]);
                a[3]();
            }

            start = new Date().getTime();

            var firstRegScan = await getFirstReg(slave);
            // await sleep(50);
            
            // output value to console
            if(firstRegScan[0] == 1){
                var reg = await getSlaveValue(slave);
                // await sleep(50);
                log(slave+':'+reg+':'+tim());
                await setFirstReg(slave);
            }
            else{
                log(slave+':'+firstRegScan+':'+tim());
            }

            start = new Date().getTime();

            await sleep(50);

            // log('------------------------'+tim());
	   }
    } catch(e){
        // if error, handle them here (it should not)
        console.log(e)
    } finally {
    	//clear();
        // after get all data from salve repeate it again
        setImmediate(() => {
            getSlavesValue(slavesIdList);
        })
    }
}


const getFirstReg = async (id) => {
    try{
        await client.setID(id);
        let val = await client.readHoldingRegisters(0, 1);
        //await sleep(50);
        return val.data;
    } catch(e){
        console.log(e)
        return -1
    }
}

const getSlaveValue = async (id) => {
    try {
        // set ID of slave
        await client.setID(id);
        // read the 1 registers starting at address 0 (first register)
        let reg = await client.readHoldingRegisters(0, slaveRegLength[id-1]);
            reg = reg.data;

        //await sleep(50);
        data[id] = reg;
        brodcast(id);
        return reg;
    } catch(e){
        // if error return -1
        console.log(e)
        return -1
    }
}

const setSlaveValue = async (id, register, value) => {
    try {
        // set ID of slave
        await client.setID(id);
        await client.writeRegister(register, value);
        await client.writeRegister(0,1);
        await sleep(50);
    } catch(e){
        
        console.log(e)
    }
}

const setFirstReg = async (id) => {
    try {
        // set ID of slave
        await client.setID(id);
        await client.writeRegister(0,0);
        // await sleep(50);
    } catch(e){
        
        console.log(e)
    }
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));


const log = (txt) => process.stdout.write('\n'+txt);

const clear = (txt) => {
    process.stdout.moveCursor(0, -6);
    process.stdout.cursorTo(0);
    process.stdout.clearScreenDown();
}

const tim = ()=>{
    return (new Date().getTime() - start) + 'ms';
}

app.listen(port, () => console.log(`
           __         __ ___       __      __ 
/  \\\\_/|  (_ |\\/| /\\ |__) |   |__|/  \\|\\/||_  
\\__/ | |  __)|  |/--\\| \\  |   |  |\\__/|  ||__ 
                                              
`));
