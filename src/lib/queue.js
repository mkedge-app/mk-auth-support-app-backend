import Bee from 'bee-queue';
import NotificationSending from '../app/jobs/NotificationSending';

import redisConfig from '../config/redis';

const jobs = [NotificationSending];

class Queue {
  constructor() {
    this.queues = {};

    this.init();
  }

  init() {
    jobs.forEach(({ key, handle }) => {
      this.queues[key] = {
        bee: new Bee(key, {
          redis: redisConfig,
        }),
        handle,
      };
    });
  }

  add(queue, job) {
    return this.queues[queue].bee.createJob(job).save();
  }

  processQueue() {
    jobs.forEach(job => {
      const { bee, handle } = this.queues[job.key];

      bee.on('failed', this.failureHandle).process(handle);
    });
  }

  failureHandle(job, err) {
    console.log(`Queue ${job.queue.name} FAILED`);
    console.log(err);
  }
}

export default new Queue();
