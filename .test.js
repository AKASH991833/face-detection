module.exports.run = async (page, base, shot) => {
  const out = [];
  // models + sample image detection can take a while headless
  await page.waitForFunction(() => document.querySelector('#st-model').textContent === 'tiny-yolo v1', {timeout: 90000});
  out.push(['models loaded', true]);
  await page.waitForFunction(() => document.querySelector('#st-ms').textContent !== '–', {timeout: 90000});
  const faces = await page.$eval('#st-faces', e => +e.textContent);
  out.push(['lena sample faces detected: ' + faces, faces >= 1]);
  const rows = await page.$$eval('.frow', r => r.length);
  out.push(['face list rows: ' + rows, rows >= 1]);
  const conf = await page.$eval('.frow .conf', e => e.textContent);
  out.push(['confidence: ' + conf, /\d{2}\.\d%/.test(conf)]);
  // switch sample
  await page.click('#sample2');
  await page.waitForFunction(() => document.querySelector('#st-ms').textContent !== '–', {timeout: 60000});
  await new Promise(r=>setTimeout(r,2500));
  const f2 = await page.$eval('#st-faces', e => +e.textContent);
  out.push(['two-people sample faces: ' + f2, f2 >= 2]);
  if (shot) await page.screenshot({path: shot});
  return out;
};
