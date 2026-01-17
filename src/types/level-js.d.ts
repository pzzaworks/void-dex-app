declare module 'level-js' {
  import type { AbstractLevelDOWN } from 'abstract-leveldown';

  function leveljs(name: string): AbstractLevelDOWN<string, string>;

  export default leveljs;
}
