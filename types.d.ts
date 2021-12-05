import { createConnection } from 'typeorm'

declare global {
  var typeormConnection: ReturnType<typeof createConnection>;
}

declare module 'isnumeric' {
  export default function isnumeric(obj: string | ibj): boolean;
}
