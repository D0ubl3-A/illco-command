import assert from 'node:assert/strict';
import { regionalRosterForWater, REGIONAL_ROSTERS } from '../src/lib/regionEcology.ts';
import { pickFish } from '../src/data/fish.ts';
const f = (name) => ({ kind: 'water', name });
assert.equal(regionalRosterForWater(f('Lake Mead'))?.id, 'lake-mead');
assert.equal(regionalRosterForWater(f('Lake Havasu'))?.id, 'lake-havasu');
assert.equal(regionalRosterForWater(f('Lake Michigan')), null);
assert.equal(regionalRosterForWater(f('Havasu City')), null);
assert.equal(regionalRosterForWater({kind:'bait-shop',name:'Lake Mead'}), null);
for (const region of REGIONAL_ROSTERS) {
  for (let i = 0; i < 2500; i++) {
    const fish = pickFish('worms','lake',1,region.speciesIds);
    assert.ok(region.speciesIds.includes(fish.id), `Out-of-region fish ${fish.id} in ${region.name}`);
    assert.notEqual(fish.id, 'golden');
    assert.notEqual(fish.id, 'pike');
    assert.notEqual(fish.id, 'sturgeon');
  }
}
assert.throws(() => pickFish('worms','lake',1,['not-a-fish']), /no matching species/);
console.log('ReelWorld regional ecology tests passed');