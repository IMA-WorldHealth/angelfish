<template>
  <div>
    <h1>
      {{ database }}
      <a
        href="#"
        class="btn btn-link float-right"
        :class="{ 'loading': isSynchronising }"
        @click="sync"
      >
        <i class="icon icon-refresh" />
        Sync Latest Database
      </a>
    </h1>

    <div v-if="isBuilding">
      <progress
        class="progress"
        max="100"
      />
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>File</th>
          <th colspan="2">
            Actions
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="file in files"
          :key="file"
        >
          <td>{{ file }}</td>
          <td>
            <a
              href="#"
              @click="build(file)"
            >Build File</a>
          </td>
          <td>
            <a
              href="#"
              @click="remove(file)"
            >Remove File</a>
          </td>
        </tr>
        <tr v-if="files.length === 0">
          <td colspan="4">
            No local files yet!
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
  import { ipcRenderer } from 'electron';
  import store from '../../store';

  export default {
    props : {
      database : {
        type :String,
        required : true,
      },
      files :{
        type: Array,
        default : () => [],
      }
    },
    data() {
      return {
        isSynchronising : false,
        isBuilding: false,
      }
    },
    methods : {
      async sync() {
        this.isSynchronising = true;
        try {
          const next = await ipcRenderer.invoke('ssh.copy', store.data, this.database.toLowerCase());
          if (next && !this.files.includes(next)) { this.files.push(next); }
        } catch (e) {
          console.error(e);
        }

        this.isSynchronising = false;
      },

      async build(fname) {
        this.isBuilding = true;
        await ipcRenderer.invoke('vfs.build-local', store.data, this.database.toLowerCase(), fname);
        this.isBuilding = false;
      },

      async remove(fname) {
        await ipcRenderer.invoke('vfs.rm-local', store.data, this.database.toLowerCase(), fname);
        const index = this.files.indexOf(fname);
        this.files.splice(index, 1);
      }
    }
  }
</script>
