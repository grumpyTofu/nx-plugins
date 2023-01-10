import mongoose, { ConnectOptions, Mongoose } from 'mongoose';

export default class Database {
  private readonly dbUri: string;
  private readonly options: ConnectOptions;
  client?: Mongoose;

  constructor(dbUri: string, options: ConnectOptions) {
    this.dbUri = dbUri;
    this.options = options;
  }

  async connect() {
    this.client = await mongoose.connect(this.dbUri, this.options);
  }
}
