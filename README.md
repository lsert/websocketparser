# websocketparser
a simple websocket frame parser


wspaser()
返回值
{
  FIN: number,
  mask: number,
  RSV1: number,
  RSV2: number,
  RSV3: number,
  opcode: number,
  data: Buffer,
}


encodeWsData(wsdata);
wsdata:{
    RSV1:number = 0,
    RSV2:number = 0,
    RSV3:number = 0,
    mask: 1 | 0 = 0,
    opcode: number,
    data: string | Buffer | Uint8Array,
}
返回值
UInt8Array

FIN会根据传入的data自动产生。
data.length若大于8192，则会自动分段，返回UInt8Array[]; FIN 和opcode会自动生成,
若mask值为1，则会自动生成随机的maskkey。
