<template>
  <main class="container grid-md">
    <section v-if="store.state === 'configuration'">
      <configure />
    </section>

    <section v-if="store.state === 'management'">
      <vfs />
    </section>
  </main>
</template>

<script>
  import configure from './components/configure/configure.vue';
  import vfs from './components/vfs/vfs.vue';
  import store from './store';

  export default {
    components : {
      configure,
      vfs,
    },
    data() {
      return { store, };
    },
  }
</script>

<style lang="css">
  @import '../../node_modules/spectre.css/dist/spectre.min.css';

  @import '../../node_modules/spectre.css/dist/spectre-icons.min.css';

  @import '../../node_modules/spectre.css/dist/spectre-exp.min.css';
</style>
