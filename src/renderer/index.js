import Vue from 'vue';
import setup from './components/setup/setup.vue';

new Vue({
  render : h => h(setup),
}).$mount('#app');
