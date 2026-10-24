// Binary heap for priority queue

export interface HeapItem {
  nodeId: string;
  priority: number;
}

export class MinHeap {
  private heap: HeapItem[] = [];

  push(item: HeapItem): void {
    this.heap.push(item);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): HeapItem | undefined {
    if (this.heap.length === 0) return undefined;
    if (this.heap.length === 1) return this.heap.pop();

    const root = this.heap[0];
    const last = this.heap.pop();
    if (!root || !last) return undefined;
    this.heap[0] = last;
    this.bubbleDown(0);
    return root;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  size(): number {
    return this.heap.length;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const current = this.heap[index];
      const parent = this.heap[parentIndex];
      if (!current || !parent || current.priority >= parent.priority) break;
      [this.heap[index], this.heap[parentIndex]] = [parent, current];
      index = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    const length = this.heap.length;
    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let smallest = index;

      if (leftChild < length && this.heap[leftChild] && this.heap[smallest] && this.heap[leftChild]!.priority < this.heap[smallest]!.priority) {
        smallest = leftChild;
      }
      if (rightChild < length && this.heap[rightChild] && this.heap[smallest] && this.heap[rightChild]!.priority < this.heap[smallest]!.priority) {
        smallest = rightChild;
      }
      if (smallest === index) break;

      const current = this.heap[index];
      const smallestItem = this.heap[smallest];
      if (!current || !smallestItem) break;
      [this.heap[index], this.heap[smallest]] = [smallestItem, current];
      index = smallest;
    }
  }
}
