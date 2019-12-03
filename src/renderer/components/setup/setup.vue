<template>
  <form name="SetupForm">
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
        v-model="backupDir"
        class="form-input"
        type="text"
      >
    </div>


    <div class="form-group">
      <button
        class="btn btn-primary"
        type="submit"
        @click="validate"
      >
        Submit
      </button>
    </div>
  </form>
</template>

<script>
  export default {
    data() {
      return {
        hostname : 'test',
      }
    },

    methods : {
      validate : function (e) {
        e.preventDefault();
        console.log('this:', this);
      }
    }
  }
</script>
