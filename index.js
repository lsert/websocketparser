// 0x0表示附加数据帧
// 0x1表示文本数据帧
// 0x2表示二进制数据帧
// 0x3 - 7暂时无定义，为以后的非控制帧保留
// 0x8表示连接关闭
// 0x9表示ping
// 0xA表示pong
// 0xB - F暂时无定义，为以后的控制帧保留

export function wsparser(d) {
  const tArr = Uint8Array.from(d);
  const group0 = tArr[0];
  const FIN = group0 >> 7;
  const RSV1 = (group0 & 64) >> 6;
  const RSV2 = (group0 & 32) >> 5;
  const RSV3 = (group0 & 16) >> 4;
  const opcode = (group0 & 15);

  const group1 = tArr[1];
  const group2 = tArr[2];
  const group3 = tArr[3];

  // 计算数据开始点
  let counter = 2;

  const mask = group1 >> 7;
  const payloadLens = group1 & 127;
  let realLens = payloadLens;
  if (payloadLens === 126) {
    realLens = (group2 << 8) | (group3);
    counter += 2;
  } else if (payloadLens === 127) {
    const ab = new ArrayBuffer(8);
    const dv = new DataView(ab);
    for (let i = 0; i < 8; i++) {
      dv.setUint8(i, tArr[i + 2]);
    }
    realLens = dv.getBigUint64();
    counter += 8;
  }

  let data;
  if (mask === 1) {
    const maskKeyArr = tArr.slice(counter, counter + 4);
    counter += 4;

    // 解掩码
    data = tArr.slice(counter).map((item, index) => {
      const j = index % 4;
      return item ^ maskKeyArr[j];
    });
  } else {
    data = tArr.slice(counter);
  }
  let arr = {
    FIN,
    mask,
    RSV1,
    RSV2,
    RSV3,
    opcode,
    data: Buffer.from(data),
  }
  return arr;
}

function getUInt8Array(data, length) {
  const a = new DataView(new ArrayBuffer(length));
  a.setBigUint64(0, BigInt(data));
  return new Uint8Array(a.buffer);
}

function createMaskKey() {
  let arr = [];
  for (let i = 0; i < 4; i++) {
    let max = 255;
    let min = 0;
    let random = Math.random() * (max - min) + min;
    arr.push(Math.round(random));
  }
  return arr;
}

export function encodeWsData(wsData, FIN = 1) {
  const {
    RSV1 = 0,
    RSV2 = 0,
    RSV3 = 0,
    mask = 0,
  } = wsData;
  let { data: originData, opcode = 1 } = wsData;
  let data = originData;
  if (originData instanceof Buffer) {
    data = new Uint8Array(originData);
  } else if (typeof originData === 'string') {
    data = new Uint8Array(Buffer.from(originData));
  } else if (data instanceof Uint8Array) {
    data = originData;
  }
  const dataArr = [];
  const lens = data.length;
  if (lens > 8192) {
    const t = Math.ceil(lens / 8192);
    const arr = [];
    for (let i = 0; i < t; i++) {
      const currentData = data.slice(i * 8192, (i + 1) * 8192);
      arr.push(encodeWsData({ ...wsData, opcode: i === 0 ? 1 : 0, data: currentData }, i >= t - 1 ? 1 : 0));
    };
    return arr;
  }
  let FIN_RSV = (
    (
      (FIN << 3) | (RSV1 << 2)
    )
    | (RSV2 << 1)
  ) | RSV3;
  const firstLetter = (FIN_RSV << 4) | opcode;
  dataArr.push(firstLetter);
  if (lens < 126) {
    dataArr.push(mask << 7 | lens);
  } else if (lens >= 126 && lens <= 65536) {
    dataArr.push(mask << 7 | 126);
    dataArr.push(lens >> 8, lens & 255);
  } else {
    dataArr.push(mask << 7 | 127);
    const arr = getUInt8Array(lens, 8);
    dataArr.push(...arr);
  }
  if (mask === 1) {
    const maskKeyArr = createMaskKey();
    data = data.map((item, index) => {
      const j = index % 4;
      return item ^ maskKeyArr[j];
    });
  }
  dataArr.push(...data);
  return new Uint8Array(dataArr);
}
