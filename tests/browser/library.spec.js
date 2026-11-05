import {test,expect} from '@playwright/test';

test('two bundled tours work without browser storage and without import/export controls',async({page})=>{
  await page.addInitScript(()=>{
    window.indexedDB.open=()=>{throw new Error('Storage unavailable');};
    Storage.prototype.getItem=()=>{throw new Error('Storage unavailable');};
    Storage.prototype.setItem=()=>{throw new Error('Storage unavailable');};
  });
  await page.goto('/');
  const selector=page.getByLabel('Percorso da ascoltare');
  await expect(selector.locator('option')).toHaveCount(2);
  await expect(page.getByText('Aggiungi un percorso',{exact:true})).toHaveCount(0);
  await expect(page.locator('input[type=file]')).toHaveCount(0);
  await expect(page.getByRole('button',{name:/Scarica/})).toHaveCount(0);
  await selector.selectOption('vienna-ring-1-2');
  await expect(page.getByRole('heading',{name:'Due facciate, due ruoli'})).toBeVisible();
  await expect(page.getByText('Audio non ancora disponibili per questo tour.')).toBeVisible();
  await expect(page.getByText(/Appena partiti da Schottentor, lasciamo/)).toBeVisible();
  await expect(page.getByRole('button',{name:'Ascolta',exact:true})).toHaveCount(0);
  await expect(page.locator('path.tram-leg')).toHaveCount(8);
  await expect(page.locator('path.transfer-path')).toHaveCount(2);
  await expect(page.getByRole('region',{name:'Itinerario'})).toContainText('Friedrich-Engels-Platz');
  await selector.selectOption('vienna-original');
  await page.getByRole('button',{name:'Ascolta',exact:true}).click();
  await expect.poll(()=>page.locator('audio').evaluate(a=>!a.paused&&a.currentTime>0)).toBe(true);
});

test('Ring tour remains bundled offline and simulation reaches Schottentor',async({page,context})=>{
  await page.goto('/');await expect(page.getByText('Pronta offline',{exact:true})).toBeVisible();
  await context.setOffline(true);await page.reload();
  await page.getByLabel('Percorso da ascoltare').selectOption('vienna-ring-1-2');
  await expect(page.getByText('Pronta offline',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Simula giro',exact:true}).click();
  for(let i=0;i<31;i++) await page.getByRole('button',{name:'Avanza simulazione'}).click();
  await expect(page.getByLabel('Scegli la tratta')).toHaveValue('7');
  await expect(page.getByRole('heading',{name:'L’anello si chiude'})).toBeVisible();
  await expect(page.getByText('Simulazione conclusa · Schottentor',{exact:true})).toBeVisible();
  expect(await page.locator('audio').getAttribute('src')).toBeNull();
});
