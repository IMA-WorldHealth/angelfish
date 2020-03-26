module.exports = {
  /* your base configuration of choice */
  extends: ['plugin:vue/recommended'],

  parserOptions: {
    parser: 'babel-eslint',
    sourceType: 'module'
  },
  plugins : [
    'html'
  ],
  env: {
    browser: true,
    node: true
  },
  globals: {
    __static: true
  }
}
