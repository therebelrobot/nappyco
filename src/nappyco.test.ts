const test = require('ava');

import Nappy from './nappyco'

const nappy = new Nappy();

test('should run fetchPosts', async (t) => {
  const results = await nappy.fetchPosts()
  // console.log(results)
	t.pass();
});

// test('bar', async t => {
// 	const bar = Promise.resolve('bar');
// 	t.is(await bar, 'bar');
// });
