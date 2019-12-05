<style>
  .legend {
    margin-bottom: 0;
  }
</style>

<template>
  <div class="modal modal-lg active">
    <a
      href="#close"
      class="modal-overlay"
      aria-label="Close"
    />

    <div class="modal-container">
      <div class="modal-header">
        <a
          href="#close"
          class="btn btn-clear float-right"
          aria-label="Close"
        />
        <div class="modal-title h5">
          Parameters
        </div>
      </div>

      <div class="modal-body">
        <div class="content">
          <form
            name="SetupForm"
          >
            <fieldset>
              <legend class="legend">
                Remote Server Parameters
              </legend>

              <div class="form-group">
                <label class="form-label">Host:</label>
                <input
                  v-model="hostname"
                  class="form-input"
                  type="text"
                  placeholder="10.0.0.35"
                >
              </div>

              <div class="form-group">
                <label class="form-label">Username:</label>
                <input
                  v-model="username"
                  class="form-input"
                  type="text"
                  placeholder="pi"
                >
              </div>

              <div class="form-group">
                <label class="form-label">Password:</label>
                <input
                  v-model="password"
                  class="form-input"
                  type="password"
                >
              </div>

              <div class="form-group">
                <label class="form-label">Folder Path:</label>
                <input
                  v-model="remotebackupdir"
                  class="form-input"
                  type="text"
                >
              </div>
            </fieldset>

            <fieldset>
              <legend class="legend">
                Local System Parameters
              </legend>

              <div class="form-group">
                <label class="form-label">Backup Folder Path:</label>
                <input
                  v-model="localbackupdir"
                  class="form-input"
                  type="text"
                  placeholder="/home/user/path"
                >
              </div>
            </fieldset>

            <fieldset>
              <legend class="legend">
                Database Parameters
              </legend>

              <div class="form-group">
                <label class="form-label">MySQL User:</label>
                <input
                  v-model="mysqluser"
                  class="form-input"
                  type="text"
                  placeholder="root"
                >
              </div>

              <div class="form-group">
                <label class="form-label">MySQL Password:</label>
                <input
                  v-model="mysqlpassword"
                  class="form-input"
                  type="password"
                >
              </div>
            </fieldset>
          </form>
        </div>

        <div class="modal-footer">
          <button
            class="btn btn-primary"
            type="submit"
            @click="submit"
          >
            Save Parameters
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import store from '../../store';

  export default {
    data() {
      return {
        hostname : '',
        username : '',
        password : '',
        remotebackupdir : '',
        localbackupdir : '',
        mysqluser: '',
        mysqlpassword:'',
      }
    },

    mounted() {
      const credentials = store.data;
      Object.assign(this, credentials);
    },

    methods : {
      submit(e) {
        e.preventDefault();

        const credentials = {
          hostname : this.hostname,
          username : this.username,
          password : this.password,
          localbackupdir : this.localbackupdir,
          remotebackupdir : this.remotebackupdir,
          mysqluser: this.mysqluser,
          mysqlpassword:this.mysqlpassword,
        };

        store.setData(credentials);
        store.setState('management');
      }
    }
  }
</script>

