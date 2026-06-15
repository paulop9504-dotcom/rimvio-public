const u = (id: string) =>
  `https://images.unsplash.com/${id}?w=960&auto=format&fit=crop&q=80`;

/** Demo / fallback place imagery when captures lack URLs. */
export function stockPhotosForPlaceLabel(placeLabel: string): readonly string[] {
  const hay = placeLabel.trim();
  if (/제주|애월|성산/u.test(hay)) {
    return [
      u("photo-1570168007204-dfb528c30a6b"),
      u("photo-1590523277543-a94d0e2474b0"),
      u("photo-1507525428034-b723cf961d3e"),
      u("photo-1469854523086-cc02fe9d0880"),
    ];
  }
  if (/둔산|대전/u.test(hay)) {
    return [
      u("photo-1514565131-fce0801e5785"),
      u("photo-1495474472287-4d45bcff1ccd"),
      u("photo-1555396273-367ea4eb4db5"),
      u("photo-1449824913935-59a10b8d2000"),
      u("photo-1517248135467-4c7edcad34c4"),
    ];
  }
  if (/강남|서울/u.test(hay)) {
    return [
      u("photo-1517154421773-0529f29ea770"),
      u("photo-1538485390081-4c6a48c1d880"),
      u("photo-1493976040374-85c8e12f0c0e"),
      u("photo-1555396273-367ea4eb4db5"),
    ];
  }
  if (/독일|베를린|뮌헨|프랑크푸르트/u.test(hay)) {
    return [
      u("photo-1560963184-10fe8839c047"),
      u("photo-1587330979470-3593cccb4c83"),
      u("photo-1599946347370-0d0a3c6439c2"),
      u("photo-1528722828814-77b9b83aafb2"),
      u("photo-1558642452-9d2a7deb1f62"),
    ];
  }
  return [
    u("photo-1469854523086-cc02fe9d0880"),
    u("photo-1506905925346-21bda4d32df4"),
    u("photo-1476514525535-07fb3b4ae5f1"),
  ];
}
