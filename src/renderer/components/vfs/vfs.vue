<template>
  <section>
    <ul class="tab">
      <li
        v-for="db in databases"
        :key="db"
        class="tab-item"
        :class="{ active : current === db}"
      >
        <a
          href="#"
          @click="setActive(db)"
        >{{ db }}</a>
      </li>

      <li
        class="tab-item tab-action"
      >
        <a
          href="#"
          class="btn btn-link float-right"
          @click="configure"
        >
          <i class="icon icon-menu" />
          Paramètres
        </a>
      </li>
    </ul>

    <datagrid
      :database="current"
      :files="files"
    />
  </section>
</template>

<script>
  import datagrid from './datagrid.vue';
  import store from '../../store';
  import { ipcRenderer } from 'electron';

  const databases = ['Vanga', 'CHK', 'IMCK'];

  export default {
    components : {
      datagrid,
    },
    data() {
      return {
        databases,
        files: [],
        current : 'Vanga',
      }
    },

    mounted() {
      this.setActive('Vanga');
    },

    methods : {
      configure() {
        store.setState('configuration');
      },

      async setActive(db) {
        this.current = db;
        const data = await ipcRenderer.invoke('vfs.list-local', store.data, this.current.toLowerCase());
        this.files = data;
      }
    }
  }
</script>
