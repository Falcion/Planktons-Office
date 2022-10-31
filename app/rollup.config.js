import merge from 'deepmerge';
import rollup from '@open-wc/building-rollup';

const def_config = rollup.createBasicConfig();

export default merge(def_config, {
  input: './out-tsc/src/app.js',
  output: {
      dir: 'dist',
  }
});