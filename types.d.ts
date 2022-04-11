import { Connection } from 'typeorm'

declare global {
  var typeormConnection: Connection;
}

declare module 'isnumeric' {
  export default function isnumeric(obj: string | ibj): boolean;
}
