// Text people write sets its own direction from its content, so a Hebrew note reads correctly in the
// English app. React Native Web renders `dir` as the HTML attribute; React Native's types do not list it.
export const AUTO_DIRECTION: object = { dir: 'auto' };
