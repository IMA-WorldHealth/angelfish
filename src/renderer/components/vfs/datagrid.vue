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
        <i class="icon icon-download" />
        Sync Latest Database
      </a>
    </h1>

    <div v-if="isBuilding">
      <h5>Building <u>{{ buildFile.name }}</u></h5>

      <progress
        class="progress"
        :max="progress.max"
        :value="progress.value"
      />

      <b> Event Log: </b>

      <ul class="event-log">
        <li
          v-for="event in logs.build"
          :key="event.id"
          class="event-log-item"
          :class="{ 'text-error' : event.type === 'error' }"
        >
          {{ event.message }}
        </li>
      </ul>
    </div>

    <div v-else-if="isSynchronising">
      <h5>Synchronising <u>{{ database }}</u></h5>

      <progress
        class="progress"
        :max="progress.max"
        :value="progress.value"
      />

      <b> Event Log: </b>
      <ul class="event-log">
        <li
          v-for="event in logs.sync"
          :key="event.id"
          class="event-log-item"
          :class="{ 'text-error' : event.type === 'error' }"
          :title="event.message"
        >
          {{ event.message }}

          <span class="text-gray">{{ event.timestamp }}</span>
        </li>
      </ul>
    </div>

    <table
      v-else
      class="table table-striped"
    >
      <thead>
        <tr>
          <th>File</th>
          <th>Size</th>
          <th>Creation Date</th>
          <th
            colspan="2"
            class="text-center"
          >
            Actions
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="file in files"
          :key="file.name"
        >
          <td>{{ file.name }}</td>
          <td>{{ file.hrSize }}</td>
          <td>
            {{ new Date(file.birthtime).toLocaleDateString('fr') }}
            {{ new Date(file.birthtime).toLocaleTimeString('fr') }}
          </td>
          <td>
            <a
              href="#"
              class="btn btn-link"
              @click="build(file)"
            >
              <i class="icon icon-refresh" />
              Build File
            </a>
          </td>
          <td>
            <a
              href="#"
              class="btn btn-link"
              style="color:red;"
              @click="remove(file)"
            >
              <i class="icon icon-delete" />
              Remove File
            </a>
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

<style>
  .event-log-item {
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>

<script>
  import { ipcRenderer as ipc } from 'electron';
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
      },
    },
    data() {
      return {
        isSynchronising : false,
        isBuilding: false,
        logs : {
          build : [],
          sync : [],
        },
        progress: {
          value: 0,
          max : 0,
        },
      }
    },
    methods : {
      async sync() {
        this.progress.value = 0;
        this.progress.max = 6;
        this.isSynchronising = true;
        this.logs.sync = [];

        const logger = (event, data) => {
          this.progress.value += 1;
          data.id = Date.now() + Math.random();
          this.logs.sync.push(data);
        }

        ipc.on('ssh.log', logger);

        // checks if the file exists already in our array of files
        const hasFileAlready = (fname) => this.files.map(f => f.name).includes(fname);

        try {
          const next = await ipc.invoke('ssh.copy', store.data, this.database.toLowerCase());
          if (next && !hasFileAlready(next.name)) { this.files.push(next); }
        } catch (e) {
          console.error(e);
        }

        // clean up
        ipc.removeListener('ssh.log', logger);
        this.isSynchronising = false;
      },

      async build(file) {
        this.progress.value = 0;
        this.progress.max = 16; // how many steps

        this.isBuilding = true;
        this.buildFile = file;
        this.logs.build = [];

        const logger = (event, data) => {
          this.progress.value += 1;
          data.id = Date.now() + Math.random();
          this.logs.build.push(data);
        }

        ipc.on('vfs.log', logger);

        await ipc.invoke('vfs.build-local', store.data, this.database.toLowerCase(), file.name);

        // clean up
        ipc.removeListener('vfs.log', logger);
        this.isBuilding = false;
        delete this.buildFile;
      },

      async remove(file) {
        await ipc.invoke('vfs.rm-local', store.data, this.database.toLowerCase(), file.name);
        const index = this.files.map(f => f.name).indexOf(file.name);
        this.files.splice(index, 1);
      }
    }
  }
</script>
