let data = {};

// load initial data if it exists
try {
  data = JSON.parse(localStorage.getItem('data'));
} catch (e) {
  data = {};
}

const hasData = Object.keys(data).length > 0;

const store = {
  debug : true,
  state : hasData ? 'management' : 'configuration',
  data,

  setState(stateName) {
    if (this.debug) console.log(`setState(${stateName});`);
    this.state = stateName;
  },

  setData(data) {
    if (this.debug) console.log(`setData(data);`);
    localStorage.setItem('data', JSON.stringify(data));
    this.data = data;
  },
}

export default store;

