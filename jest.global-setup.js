// Fixed timezone with DST, so date tests behave the same on every machine.
module.exports = () => {
  process.env.TZ = 'America/New_York';
};
