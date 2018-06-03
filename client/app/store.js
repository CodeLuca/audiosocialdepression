import { computed, observable } from "mobx"

export class Store {
  @observable todos = 'x';

  createTodo(value) {

  }
}

export default new Store