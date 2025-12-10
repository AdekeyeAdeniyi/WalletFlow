import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    protected readonly userRepository: Repository<User>,
  ) {}
  async findByEmail(email: string): Promise<any> {
    try {
      return await this.userRepository.findOne({ where: { email } });
    } catch (error) {
      throw new HttpException(
        'Error finding user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createUser(userData: Partial<User>): Promise<User> {
    try {
      const newUser = this.userRepository.create(userData);
      return await this.userRepository.save(newUser);
    } catch (error) {
      throw new HttpException(
        'Error creating user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
