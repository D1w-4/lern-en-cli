import * as firebase from 'firebase-admin';
import 'firebase/auth';
import 'firebase/database';
import * as fs from 'fs';
import * as path from 'path';
import { LearnModel } from '../models/learn.model';
import { DataAdapter } from './data.adapter';

export interface IFireBaseAdapterConfig {
  filePath: string;
}

export class FirebaseAdapter extends DataAdapter {
  collection: firebase.firestore.CollectionReference<firebase.firestore.DocumentData>;
  fb: firebase.firestore.Firestore;
  name = 'firebase';

  prepareData(learModel: LearnModel):object {
    return JSON.parse(
      JSON.stringify(learModel),
    )
  }

  async add(learModel: LearnModel): Promise<void> {
    await this.collection.doc(learModel.id).set(
      this.prepareData(learModel)
    );
  }

  init(config: IFireBaseAdapterConfig): void {
    const fbConfig = JSON.parse(fs.readFileSync(
      path.resolve(config.filePath), { encoding: 'utf-8' },
    ));

    firebase.initializeApp({
      credential: firebase.credential.cert(fbConfig),
    });

    this.fb = firebase.firestore();
    this.collection = this.fb.collection('words');
  }

  async read(): Promise<Array<LearnModel>> {
    const dataList = await this.collection.get();
    const result = [];
    dataList.forEach((data) => {
      result.push(new LearnModel(data.data()));
    });
    return result;
  }

  async remove(learModel: LearnModel): Promise<void> {
    await this.collection.doc(learModel.id).delete();
  }

  async update(learModel: LearnModel): Promise<void> {
    await this.collection.doc(learModel.id).set(this.prepareData(learModel));
  }
}
